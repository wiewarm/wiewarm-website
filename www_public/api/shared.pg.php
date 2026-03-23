<?php
// PostgreSQL-specific database functions

function pconnect() {
    global $logger;
    $host = getenv('POSTGRES_HOST') ?: 'ci-postgres';
    $db = getenv('POSTGRES_DB') ?: die();
    $user = getenv('POSTGRES_USER') ?: die();
    $pw = getenv('POSTGRES_PASSWORD') ?: die();
    $connstr = "host=$host port=5432 dbname=$db user=$user password=$pw";
    $logger->debug("Connecting to PostgreSQL with: " . preg_replace("/password=\w+/", "password=***", $connstr));
    
    $connection = pg_pconnect($connstr);
    if (!$connection) {
        $logger->err("Failed to connect to PostgreSQL: " . pg_last_error());
        throw new \Exception("Database connection failed");
    }
    return $connection;
}

function query($conn, $sql, $params = array()) {
    global $logger;
    $logger->debug("Executing query: " . $sql);
    $logger->debug("With params: " . print_r(sanitizeLogContext($params), true));
    
    if (empty($params)) {
        $result = pg_query($conn, $sql);
    } else {
        $result = pg_query_params($conn, $sql, $params);
    }
    
    if (!$result) {
        $logger->err("Query failed: " . pg_last_error($conn));
        throw new \Exception("Database query failed");
    }
    
    return $result;
}

function fetch_assoc($result) {
    return pg_fetch_assoc($result);
}

function prepare($conn, $sql) {
    // Generate a unique statement name
    $stmtname = "stmt_" . md5($sql);
    return pg_prepare($conn, $stmtname, $sql);
}

function execute($stmt, ...$params) {
    // In PostgreSQL, we need to execute with the connection and statement name
    $host = getenv('POSTGRES_HOST') ?: 'ci-postgres';
    $conn = pg_connect("host=$host port=5432 dbname=wiewarm user=postgres password=postgres");
    $stmtname = "stmt_" . md5($stmt);
    return pg_execute($conn, $stmtname, $params);
}

function commit($conn) {
    return pg_query($conn, "COMMIT");
}

function getTextualId($conn, $badid) {
    global $logger;
    $sql = "SELECT textual_id FROM bad_textual_id WHERE id = $1";
    $result = query($conn, $sql, array($badid));
    $row = fetch_assoc($result);
    
    if ($row) {
        return $row['textual_id'];
    }
    
    return null;
}

function badOwnsBecken($conn, $badid, $beckenid) {
    global $logger;
    $sql = "SELECT COUNT(*) as count FROM becken WHERE id = $1 AND badid = $2";
    $result = query($conn, $sql, array($beckenid, $badid));
    $row = fetch_assoc($result);
    
    return $row['count'] > 0;
}

function fbexecute3($conn, $sql, $arg1, $arg2, $arg3) {
    global $logger;
    $logger->debug("pgexecute \n<" . $sql . ">\n<" . print_r(sanitizeLogContext(array($arg1, $arg2, $arg3)), true) . ">");

    // Convert Firebird-style parameter placeholders (?) to PostgreSQL style ($1)
    $i = 0;
    $sql = preg_replace('/\?/', '$' . ++$i, $sql);
    
    $c2 = pconnect();
    pg_query($c2, "BEGIN");
    $result = pg_query_params($c2, $sql, array($arg1, $arg2, $arg3));
    
    if (!$result) {
        $logger->err("Query failed: " . pg_last_error($c2));
        commit($c2);
        throw new \Exception("Database query failed");
    }
    
    $affected = pg_affected_rows($result);
    $commit_result = commit($c2);
    
    return "aff=$affected pg_rc=" . ($commit_result ? "OK" : "FAIL") . " sql=$sql args=$arg1::$arg2::$arg3";
}

function fbexecute($conn, $sql, $data) {
    global $logger;
    $logger->debug("pgexecute \n<" . $sql . ">\n<" . print_r(sanitizeLogContext($data), true) . ">");

    // Convert Firebird-style parameter placeholders (?) to PostgreSQL style ($1)
    $i = 0;
    $sql = preg_replace('/\?/', '$' . ++$i, $sql);

    $c2 = pconnect();
    pg_query($c2, "BEGIN");
    $result = pg_query_params($c2, $sql, $data);
    
    if (!$result) {
        $logger->err("Query failed: " . pg_last_error($c2));
        commit($c2);
        throw new \Exception("Database query failed");
    }
    
    $affected = pg_affected_rows($result);

    $logger->debug("pgexecute rc <" . print_r($affected, true) . ">");

    commit($c2);
    return $affected;
} 
