<?php
// Author: Marcel Hadorn
// Import newest water temperature from the Badi Messen website

// Set timezone to Europe/Zurich
date_default_timezone_set('Europe/Zurich');

// Database connection settings
$host = getenv('POSTGRES_HOST') ?: 'localhost';
$dbname = getenv('POSTGRES_DB') ?: 'wiewarm';
$user = getenv('POSTGRES_USER') ?: 'postgres';
$password = getenv('POSTGRES_PASSWORD') ?: 'postgres';

// Connect to PostgreSQL
$conn = pg_connect("host=$host port=5432 dbname=$dbname user=$user password=$password");
if (!$conn) {
    die("Failed to connect to PostgreSQL: " . pg_last_error());
}

function getLastDateTime($conn, $beckenId) {
    $sql = "SELECT newest_datum as dmax FROM becken WHERE id = $1";
    $result = pg_query_params($conn, $sql, array($beckenId));
    if (!$result) {
        echo "Error getting last date time: " . pg_last_error($conn) . "\n";
        return 0;
    }

    $data = pg_fetch_assoc($result);
    if ($data && $data['dmax']) {
        return strtotime($data['dmax']);
    }
    return 0;
}

function fetchPage($url) {
    $context = stream_context_create(array(
        'http' => array(
            'header' => "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36\r\n" .
                        "Accept-Language: de-DE,de;q=0.9,en;q=0.8\r\n" .
                        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n",
            'timeout' => 20,
        ),
        'https' => array(
            'header' => "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36\r\n" .
                        "Accept-Language: de-DE,de;q=0.9,en;q=0.8\r\n" .
                        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n",
            'timeout' => 20,
        ),
    ));

    $data = @file_get_contents($url, false, $context);
    if ($data === false || trim($data) === '') {
        return null;
    }

    return $data;
}

function extractWaterTemperature($html) {
    $patterns = array(
        '/Wassertemperatur.*?<div[^>]*class="[^"]*elementor-shortcode[^"]*"[^>]*>\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:°|&deg;|deg)?\s*(?:C|°C)/is',
        '/Wassertemperatur.*?([0-9]+(?:[.,][0-9]+)?)\s*(?:°|&deg;|deg)?\s*(?:C|°C)/is',
        '/([0-9]+(?:[.,][0-9]+)?)\s*(?:°|&deg;|deg)?\s*(?:C|°C)/iu',
    );

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $match)) {
            return str_replace(',', '.', $match[1]);
        }
    }

    $text = strip_tags($html);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/[\x{00A0}\x{200B}-\x{200D}\x{FEFF}]+/u', ' ', $text);
    $text = preg_replace('/\s+/u', ' ', $text);

    $pos = stripos($text, 'Wassertemperatur');
    if ($pos !== false) {
        $snippet = substr($text, $pos, 220);
        if (preg_match('/Wassertemperatur.*?([0-9]+(?:[.,][0-9]+)?)/is', $snippet, $match)) {
            return str_replace(',', '.', $match[1]);
        }
    }

    return null;
}

function extractUpdateDate($html) {
    $patterns = array(
        '/(?:Aktualisiert|Stand|Messung|gemessen|Letzte\s+Messung|Erfasst\s+am)\s*(?:am\s*)?([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i',
        '/([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4})\s*(?:um\s*)?[0-9]{1,2}:[0-9]{2}/i',
        '/([0-9]{4}-[0-9]{2}-[0-9]{2})[T\s][0-9]{2}:[0-9]{2}/i',
    );

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $match)) {
            $timestamp = strtotime($match[1]);
            if ($timestamp !== false) {
                return $timestamp;
            }
        }
    }

    return null;
}

function getLimpach($conn, $url, $beckenId) {
    $data = fetchPage($url);
    if (!$data) {
        echo "Failed to fetch data from $url\n";
        return;
    }

    $temperature = extractWaterTemperature($data);
    if ($temperature === null) {
        echo "Could not find temperature data in response\n";
        return;
    }

    $temperatureInt = floatval($temperature) * 10;
    $current_time = date('Y-m-d H:i:s');

    // First mark all existing temperatures as not newest
    $sql = "UPDATE temperatur SET newest = false WHERE beckenid = $1";
    $result = pg_query_params($conn, $sql, array($beckenId));
    if (!$result) {
        echo "Error updating existing temperatures: " . pg_last_error($conn) . "\n";
        return;
    }

    // Insert new temperature
    $sql = "INSERT INTO temperatur (id, beckenid, badmeisterid, newest, datum, wert) 
            VALUES (nextval('gen_temperatur'), $1,
                   (SELECT id FROM badmeister WHERE badid = (SELECT badid FROM becken WHERE id = $1) LIMIT 1),
                   true, $2, $3)";
    $result = pg_query_params($conn, $sql, array($beckenId, $current_time, $temperatureInt));

    if (!$result) {
        echo "Error inserting temperature: " . pg_last_error($conn) . "\n";
        return;
    }

    echo 'inserted: ' . $temperature . ' °C to becken ' . $beckenId . ' at ' . $current_time . "\n";

    // Update becken table with newest temperature
    $sql = "UPDATE becken SET newest_temp = $1, newest_datum = $2 WHERE id = $3";
    $result = pg_query_params($conn, $sql, array($temperatureInt, $current_time, $beckenId));
    if (!$result) {
        echo "Error updating becken: " . pg_last_error($conn) . "\n";
    }
}

// Get temperatures
getLimpach($conn, "https://schwimmbad-messen.ch/", 500);

pg_close($conn);
?>
