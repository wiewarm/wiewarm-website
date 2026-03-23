<?php
// --------------------------------------------------------------------------
//
// Author : Marcel Hadorn
// Was    : Import Wassertemperaturen Strandbad Thun Thunersee
// Date   : 03.06.2009
// Updated: PostgreSQL migration
//
// --------------------------------------------------------------------------

// Set timezone to Europe/Zurich
date_default_timezone_set('Europe/Zurich');

// Database connection settings
$host = getenv('POSTGRES_HOST') ?: die();
$dbname = getenv('POSTGRES_DB') ?: die();
$user = getenv('POSTGRES_USER') ?: die();
$password = getenv('POSTGRES_PASSWORD') ?: die();

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
        return null;
    }
    
    $data = pg_fetch_assoc($result);
    if ($data && $data['dmax']) {
        return strtotime($data['dmax']);
    }
    return 0;
} // getLastDateTime

// Check if value has changed and insert temperature
function checkForInsert($conn, $badmeisterId, $beckenId, $temperature, $changed) {
    $lastDateTime = getLastDateTime($conn, $beckenId);
    
    if ($changed > $lastDateTime) {
        // Convert temperature to integer format (same as main app)
        $temp_int = floatval($temperature) * 10;
        $current_time = date('Y-m-d H:i:s', $changed);
        
        // First mark all existing temperatures as not newest
        $sql = "UPDATE temperatur SET newest = false WHERE beckenid = $1";
        $result = pg_query_params($conn, $sql, array($beckenId));
        if (!$result) {
            echo "Error updating existing temperatures: " . pg_last_error($conn) . "\n";
            return;
        }
        
        // Insert new temperature
        $sql = "INSERT INTO temperatur (id, beckenid, badmeisterid, newest, datum, wert) 
                VALUES (nextval('gen_temperatur'), $1, $2, true, $3, $4)";
        $result = pg_query_params($conn, $sql, array($beckenId, $badmeisterId, $current_time, $temp_int));
        
        if (!$result) {
            echo "Error inserting temperature: " . pg_last_error($conn) . "\n";
            return;
        }
        
        echo 'inserted ' . $temperature . ' °C to becken ' . $beckenId . "\n";
        
        // Update becken table with newest temperature
        $sql = "UPDATE becken SET newest_temp = $1, newest_datum = $2 WHERE id = $3";
        $result = pg_query_params($conn, $sql, array($temp_int, $current_time, $beckenId));
        if (!$result) {
            echo "Error updating becken: " . pg_last_error($conn) . "\n";
        }
    } else {
        echo 'not updated becken ' . $beckenId . "\n";
    }
} // checkForInsert

function getData() {
    $url = 'https://www.wsct.ch/vantage/wiewarm.txt';
    $lines = file($url);
    if (!$lines) {
        throw new Exception("Failed to fetch data from $url");
    }
    
    $elements = explode(";", $lines[0]);
    if (count($elements) < 4) {
        throw new Exception("Invalid data format from $url");
    }
    
    return $elements;
}

// Main execution
try {
    $elements = getData();
    $date = $elements[0];
    $time = $elements[1];
    $temp_see = $elements[2];
    $temp_becken = $elements[3];
    
    // Parse date and time
    //
    /*
    $changed = mktime(
        substr($time, 0, 2),    // hour
        substr($time, 3, 2),    // minute
        0,                      // second
        substr($date, 3, 2),    // month
        substr($date, 0, 2),    // day
        substr($date, 6, 4)     // year
    );
     */

    $changed = mktime(
        (int) substr($time, 0, 2),
        (int) substr($time, 3, 2),
        0,
        (int) substr($date, 3, 2),
        (int) substr($date, 0, 2),
        (int) substr($date, 6, 4)
    );
    
    // BadmeisterID=229, BeckenID=23 (See); BeckenID=22 (Becken 50m)
    checkForInsert($conn, 229, 23, $temp_see, $changed);
    checkForInsert($conn, 229, 22, $temp_becken, $changed);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

pg_close($conn);
?>
