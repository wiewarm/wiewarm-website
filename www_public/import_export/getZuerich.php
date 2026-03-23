<?php
// Author: Christian Kaufmann
// Updated to use PostgreSQL directly

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

function getSee($conn, $url, $beckenId) {
    $data = file_get_contents($url);
    if (!$data) {
        echo "Failed to fetch data from $url\n";
        return;
    }
    
    // Look for temperature with different possible encodings
    $ix = strpos($data, "°C", strpos($data, "Wassertemperatur"));
    if ($ix === false) {
        $ix = strpos($data, "C", strpos($data, "Wassertemperatur"));
    }
    if ($ix === false) {
        $ix = strpos($data, "&deg;C", strpos($data, "Wassertemperatur"));
    }
    if ($ix === false) {
        echo "Could not find temperature data in response\n";
        return;
    }
    
    $tmp = substr($data, $ix-15, 15);
    preg_match("/>([\d,]+)/", $tmp, $m);
    if (empty($m[1])) {
        echo "Could not extract temperature value\n";
        return;
    }
    
    $tmp = str_replace(',', '.', $m[1]);
    echo "$tmp";
    
    // Insert temperature into PostgreSQL
    $temperature = floatval($tmp) * 10; // Convert to integer (same as main app)
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
    $result = pg_query_params($conn, $sql, array($beckenId, $current_time, $temperature));
    
    if (!$result) {
        echo "Error inserting temperature: " . pg_last_error($conn) . "\n";
        return;
    }
    
    echo 'inserted: ' . $tmp . ' °C to becken ' . $beckenId . "\n";
    
    // Update becken table with newest temperature
    $sql = "UPDATE becken SET newest_temp = $1, newest_datum = $2 WHERE id = $3";
    $result = pg_query_params($conn, $sql, array($temperature, $current_time, $beckenId));
    if (!$result) {
        echo "Error updating becken: " . pg_last_error($conn) . "\n";
    }
    
} // getSee

// Get temperatures
getSee($conn, "https://www.tecson-data.ch/zurich/tiefenbrunnen/index.php", 43);
//getSee($conn, "https://www.tecson-data.ch/zurich/mythenquai/index.php", 44);

pg_close($conn);
?>
