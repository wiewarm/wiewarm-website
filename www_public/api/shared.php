<?php

    $__latest__records = 10;

    $www_logfile = '';
    $cli_logfile = '';

    // registered api_keys moved to /home/wiewarm/api_keys.php on flo5
    
    $logger = ""; # global log object

    // Include the appropriate database implementation
    $db_type = getenv('DB_TYPE') ?: 'postgres';
    require_once __DIR__ . "/shared." . ($db_type === 'postgres' ? 'pg' : 'fb') . ".php";

    /*
        Sanitize dirty integer input
    */
    function numbersOnly($in, $default = 1){
        preg_match("/(\d+)/", $in, $matches);
        return $matches[1] ?  $matches[1] : $default;
    }

    /*
        Sanitize dirty textid input
    */
    function textidOnly($in, $default = "Frei-_und_Hallenbad_Burgdorf"){
        preg_match("/^([.,\d\w\-_öäüéè]+)$/", $in, $matches);

		global $logger;
            $logger->debug("textid: $in");
        return $matches[1] ?  $matches[1] : $default;
    }

    /*
        Try to obtain a cached value from APC, 
        or execute a function to get a fresh value from the database.
        $sqlarg is passed to this function to submit query parameters
    */
    function apc_wrapper($cacheKey, $fetchFunction, $sqlarg, $ttl = 5, $forceFetch = false){
        global $logger;
        $cacheValue = apcu_fetch($cacheKey);

        // ignore cache
        $ttl = 1;
        $forceFetch = true;

        if (!$cacheValue || $forceFetch){
            $logger->debug("Cache miss: $cacheKey");
            $cacheValue = $fetchFunction($sqlarg);
            apcu_add($cacheKey, $cacheValue, $ttl);
        }else{
            $logger->debug("Cache hit: $cacheKey");
        }

        return $cacheValue;
    }

    /*
     *  Pretty-print/shorten timestamp
     */
    function date_pretty($ts, $with_day=false){
        global $logger;
        if ($ts === null) {
            return '';
        }
        $dinput = date_create($ts);
        $dnow = date_create();
        
        $pretty = $ts;

        if ($dinput){
            if ($dinput->format('Y-m-d') == $dnow->format('Y-m-d')){
                // $ts of today, only show time 
                $pretty =  $dinput->format('H:i');
                if ($with_day){
                    $pretty = "heute, " . $pretty;
                }
            }else if ($dinput->format('Y-m') == $dnow->format('Y-m') && $dinput->format('d') == $dnow->format('d')){
                // same month and day
                $pretty =  $dinput->format('H:i');
            }else if ($dinput->format('Y-m') == $dnow->format('Y-m')){
                // same month
                $pretty =  $dinput->format('d.m.');
            }else if ($dinput->format('Y') == $dnow->format('Y')){
                // same year
                $pretty =  $dinput->format('d.m.');
            }else{
                // not even same year 
                $pretty =  $dinput->format('Y');
            }
        }

        return $pretty;
    }

    /*
     *  de_CH date formatter
     */
    function date_ch($ts){
        global $logger;
        if ($ts === null) {
            return '';
        }
        $dinput = date_create($ts);
        $dnow = date_create();
        
        $pretty = $ts;

        if ($dinput){
            $pretty =  $dinput->format('d.m.y H:i');
        }

        return $pretty;
    }

    /*
     *  Convert array to associative array with key
     */
    function a2index($array, $key){
        $index = array();
        foreach ($array as $item){
            $index[$item[$key]] = $item;
        }
        return $index;
    }

    function sanitizeLogValue($value, $key = null){
        $sensitiveKeys = array(
            'pincode',
            'password',
            'password_hash',
            'api_key',
            'secret_sudopw',
            'inputhash',
            'newhash'
        );

        if (is_array($value)) {
            $sanitized = array();
            foreach ($value as $k => $v) {
                $sanitized[$k] = sanitizeLogValue($v, is_string($k) ? strtolower($k) : null);
            }
            return $sanitized;
        }

        if ($key !== null && in_array($key, $sensitiveKeys, true)) {
            return '[REDACTED]';
        }

        if (is_object($value)) {
            return '[OBJECT ' . get_class($value) . ']';
        }

        if (is_resource($value)) {
            return '[RESOURCE]';
        }

        return $value;
    }

    function sanitizeLogContext($value){
        return sanitizeLogValue($value);
    }

    /*
     *  Check pincode for bad
     */
    function pincodeCheck($badId, $input){
        global $logger;

        $conn = pconnect();
        $badid = numbersOnly($badId);
        $newhash = null;

        $sql = "select password_hash from bad where id = $1 and password_hash is not null";
        $logger->debug($sql . " badid=" . $badid);

        $sth = query($conn, $sql, array($badid));
        while ($row = fetch_assoc($sth)){
            $row = array_change_key_case($row, CASE_LOWER);
            $newhash = $row['password_hash'];
        }

        $valid = false;
        if ($newhash) {
            $inputhash = crypt($input, $newhash);
            $valid = is_string($inputhash) && hash_equals($newhash, $inputhash);
            $logger->debug("$badid : password-hash login valid=$valid");
        }

        if (!$valid) {
            $sudoPw = getenv('SECRET_SUDOPW');
            if ($sudoPw !== false && strcmp($input, $sudoPw) === 0) {
                $valid = true;
                $logger->debug("$badid : sudo login valid=1");
            }
        }

        if ($valid) {
            return true;
        } else {
            $remoteAddr = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'cli';
            $s = "user badid $badId from " . $remoteAddr . " authentication failure";
            $logger->debug($s);
            error_log($s);
            if (!headers_sent()) {
                header('X-wiewarm-api-status: 401', true, 401);
            }
            return false;
            sleep(5);
        }
    }

    /*
     *  Get list of images for a bad
     */
    function imagelist($badid){
        global $logger;
        $badid = numbersOnly($badid);
        
        $images = array();
        $base = "/var/www/html/img";
        $pattern = $base . "/baeder/$badid/*.jpg";
        
        foreach (glob($pattern) as $image) {
            $filename = basename($image);
            $textfile = str_replace('.jpg', '.txt', $image);
            $text = '';
            if (file_exists($textfile)) {
                $text = file_get_contents($textfile);
            }
            
            $images[] = array(
                'image' => "img/baeder/$badid/$filename",
                'text' => $text,
                'thumbnail' => "img/baeder-thumbnail/$badid/$filename",
                'original' => "img/baeder-orig/$badid/$filename"
            );
        }
        
        // Sort by filename numerically
        usort($images, function($a, $b) {
            $a_num = intval(pathinfo($a['image'], PATHINFO_FILENAME));
            $b_num = intval(pathinfo($b['image'], PATHINFO_FILENAME));
            return $a_num - $b_num;
        });
        
        return $images;
    }
