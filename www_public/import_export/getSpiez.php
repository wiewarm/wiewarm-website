<?php
// --------------------------------------------------------------------------
//
// Author : Marcel Hadorn
// Was    : Import Wassertemperaturen Freibad Spiez
// Date   : 17.05.2013
// Updated: PostgreSQL migration
//
// --------------------------------------------------------------------------

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
    $url = 'https://www.freibadspiez.ch/freibad/index.php';
    $html = file_get_contents($url);
    if (!$html) {
        throw new Exception("Failed to fetch data from $url");
    }
    
    // Parse temperatures from HTML
    $temperatures = array();
    
    // Extract temperatures from flexbox structure
    // Look for the flex container with temperature data
    if (preg_match('/<div[^>]*style="[^"]*display:\s*flex[^"]*flex-wrap:\s*wrap[^"]*"[^>]*>(.*?)<\/div>/s', $html, $container_match)) {
        $flex_content = $container_match[1];
        
        // Extract all <p> elements with their content
        preg_match_all('/<p[^>]*>(.*?)<\/p>/s', $flex_content, $p_elements);
        
        if (isset($p_elements[1]) && count($p_elements[1]) >= 10) {
            $elements = $p_elements[1];
            
            // Process elements in pairs (name, temperature)
            for ($i = 0; $i < count($elements); $i += 2) {
                if (isset($elements[$i]) && isset($elements[$i + 1])) {
                    $pool_name = trim($elements[$i]);
                    $temperature_text = trim($elements[$i + 1]);
                    
                    // Extract temperature value from text like "25.8°C"
                    if (preg_match('/([0-9.]+)°C/', $temperature_text, $temp_match)) {
                        $temperature = $temp_match[1];
                        // Remove trailing colon from pool name for mapping
                        $pool_name_clean = rtrim($pool_name, ':');
                        $temperatures[$pool_name_clean] = $temperature;
                    }
                }
            }
        }
    }
    
    // Fallback: try the old regex patterns if flexbox parsing fails
    if (empty($temperatures)) {
        $patterns = array(
            'Nichtschwimmerbecken' => '/Nichtschwimmerbecken:\s*([0-9.]+)°C/',
            'Planschbecken' => '/Planschbecken:\s*([0-9.]+)°C/',
            'Schwimmbecken' => '/Schwimmbecken:\s*([0-9.]+)°C/',
            'Sprungbecken' => '/Sprungbecken:\s*([0-9.]+)°C/',
            'Thunersee (Spiez)' => '/Thunersee \(Spiez\):\s*([0-9.]+)°C/'
        );
        
        foreach ($patterns as $pool_name => $pattern) {
            if (preg_match($pattern, $html, $matches)) {
                $temperatures[$pool_name] = $matches[1];
            }
        }
    }
    
    if (empty($temperatures)) {
        throw new Exception("Could not find temperature data in response");
    }
    
    return $temperatures;
}

// Main execution
try {
    $temperatures = getData();
    $current_time = time();
    
    // BadmeisterID for Spiez
    $badmeisterId = 7;
    
    // Map pool names to becken IDs
    $beckenMapping = array(
        'Nichtschwimmerbecken' => 12,
        'Planschbecken' => 14,
        'Schwimmbecken' => 11,
        'Sprungbecken' => 13,
        'Thunersee (Spiez)' => 15
    );
    
    foreach ($temperatures as $pool_name => $temperature) {
        if (isset($beckenMapping[$pool_name])) {
            $beckenId = $beckenMapping[$pool_name];
            echo "Processing $pool_name: $temperature °C (Becken ID: $beckenId)\n";
            checkForInsert($conn, $badmeisterId, $beckenId, $temperature, $current_time);
        } else {
            echo "Warning: No becken mapping found for $pool_name\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

pg_close($conn);
?>
