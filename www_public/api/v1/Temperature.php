<?php

namespace v1;
require_once("Log.php");
require_once(__DIR__ . "/../shared.php");
use \Luracast\Restler\RestException;

class Temperature {

    private $con;

    function __construct(){
       
        global $logger; 
        $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'Temperature.php');

    }

    /**
     * Get a list of all current temperatures
     *
     * Returns an array the current temperatures for all BECKEN
     *
     * @param mixed $max_age Maximum age in days for value to be still considered current (FIXME: not implemented, use 0)
     *
     * @return mixed
     */
    function all_current($max_age){
        global $logger;

        $cacheKey = "wwapi.v1.temperature.all_current";
        $logger->debug("exec all_current");

        $fetchFunction = function($badid){
            global $logger;
            $con = \pconnect();

            $sql = "SELECT 
                b.id AS badid, 
                btid.textual_id AS badid_text, 
                b.name AS bad, 
                b.ort AS ort, 
                b.plz AS plz, 
                b.kanton AS kanton, 
                be.id AS beckenid, 
                be.name AS becken, 
                ROUND(CAST(be.newest_temp::float / 10.0 AS numeric), 1)::text AS temp, 
                TO_CHAR(be.newest_datum, 'YYYY-MM-DD HH24:MI:SS') AS date,
                COALESCE(be.ortlat, b.ortlat) AS ortlat, 
                COALESCE(be.ortlong, b.ortlong) AS ortlong 
                FROM bad b 
                JOIN becken be ON b.id = be.badid 
                JOIN bad_textual_id btid ON b.id = btid.id 
                WHERE be.newest_temp IS NOT NULL AND be.ismain = 'T'";

            $logger->debug("Query: $sql");
            
            $sth = \query($con, $sql);
            if (!$sth) {
                return array('Error PG:', pg_last_error($con));
            }
            
            $rows = array(); 
            while ($row = \fetch_assoc($sth)){
                $row['date_pretty'] = \date_pretty($row['date'], true);

                if ($row['ortlat'] && $row['ortlong'] && strlen($row['ortlat']) == 8){
                    $row['ortlat']  = preg_replace("/\d{6}$/", "", $row['ortlat']) . "." . preg_replace("/^(\d{1,2})(\d{6})$/", "$2", $row['ortlat']);
                    $row['ortlong']  = preg_replace("/\d{6}$/", "", $row['ortlong']) . "." . preg_replace("/^(\d{1,2})(\d{6})$/", "$2", $row['ortlong']);
                } else {
                    $row['ortlat']  = null;
                    $row['ortlong']  = null;
                }

                $img = @scandir("/var/www/html/img/baeder/" . $row['badid']);
                if (!$img){
                    $img = [];
                }
                $row['images'] = array_values(array_filter($img, function($item) { return strstr($item, ".jpg");}));

                $rows[] = $row;
            }

            return $rows;
        };

        $cacheValue = \apc_wrapper($cacheKey, $fetchFunction, null, 300);
        return $cacheValue;
    }

    /**
     * Get the current temperatures for all BECKEN of a BAD
     *
     * Returns the current temperatures for all BECKEN of a BAD. 
     * The <code>badid</code> must be specified.
     *
     * @param mixed $badid Numeric id of BAD
     *
     * @return mixed
     */
    function get($badid){
        global $logger;
        $logger->debug("---- get(), " . print_r($badid, true));
        $badid = \numbersOnly($badid);
        $cacheKey = "wwapi.v1.temperature.get.badid.$badid";

        $fetchFunction = function($badid){
            global $logger;
            $con = \pconnect();

            $sql = "SELECT id AS beckenid, 
                           CAST(newest_temp::float / 10.0 AS text) AS temp, 
                           TO_CHAR(newest_datum, 'YYYY-MM-DD HH24:MI:SS') AS date 
                    FROM becken 
                    WHERE badid = $1 
                    ORDER BY id";

            $logger->debug("Query: $sql");
            
            $sth = \query($con, $sql, array($badid));
            if (!$sth) {
                return array('Error PG:', pg_last_error($con));
            }
            
            $rows = array(); 
            while ($row = \fetch_assoc($sth)){
                $rows[$row['beckenid']] = $row;
            }

            return $rows;
        };

        $cacheValue = \apc_wrapper($cacheKey, $fetchFunction, $badid);
        return $cacheValue;
    }

    /**
     * Get a list temperatures for all BECKEN of a BAD in the last days
     *
     * @param mixed $badid Numeric id of BAD
     *
     * @return mixed
     */
    /*
    private function series($badid, $days){
        global $logger;
        $logger->debug("get(), ", print_r($badid, true));
        $badid = numbersOnly($badid);
        $badid = numbersOnly($days);

        $fetchFunction = function($badid, $days){

            global $logger;
            $con = pconnect();

            $sql = "select id as \"beckenid\", wert / 10.0 as \"temp\", 
                datum as \"date\" from temperatur 
                where beckenid in  (select id from becken where badid = $badid)";
            $logger->debug("Query: $sql");
            
            $sth = ibase_query($con, $sql);
       
            if (! $sth){
                return (array('Error IB:', ibase_errmsg()));
            }
            
            $rows = array(); 
            while ($row = ibase_fetch_assoc($sth)){
                $rows[$row['beckenid']] = $row;
            }

            return $rows;

        };

        $cacheValue = apc_wrapper($cacheKey, $fetchFunction, $badid);
        return $cacheValue;
    }
        */

    /**
     * Update temperature of BECKENs
     *
     * Update temperature of one or multiple BECKENs. Also allows additionally
     * setting the STATUS.
     * <pre>request_data := {badid: b, pincode: p, temp: {id: value, ...}, status: {id: value,...}}</pre>
     *
     * @return mixed
     */
    function post($request_data){
        global $logger;
        $con = \pconnect();
        $logger->debug("post input:" . print_r(\sanitizeLogContext($request_data), true));

        if (empty($request_data)) {
            throw new RestException(412, "request_data is null");
        }

        // verify login
        $badid = \numbersOnly($request_data['badid']);
        $badid_text = \getTextualId($con, $badid);
        $pincode = $request_data['pincode'];

        if (! \pincodeCheck($badid, $pincode)){
            throw new RestException(401,"Nope! Bad User!");
        }

        // update temp  
        foreach($request_data['temp'] as $beckenid => $value){
            $beckenid = \numbersOnly($beckenid);
            $logger->debug("request: temp $beckenid $value");
            if (! \badOwnsBecken($con, $badid, $beckenid)){
                throw new RestException(401,"Nope! Bad User! Can only modify own resources.");
            }

            $value = floor($value * 10);

            // First mark all existing temperatures as not newest
            $sql = "UPDATE temperatur SET newest = 'F' WHERE beckenid = $1";
            \fbexecute($con, $sql, array($beckenid));

            // Then insert the new temperature
            $sql = "INSERT INTO temperatur (id, beckenid, badmeisterid, newest, datum, wert) 
                   VALUES (nextval('gen_temperatur'), 
                          $1, 
                          (SELECT id FROM badmeister WHERE badid = $2 LIMIT 1),
                          'T',
                          CURRENT_TIMESTAMP,
                          $3)";
            \fbexecute($con, $sql, array($beckenid, $badid, $value));
        }

        // Update status if provided
        if (isset($request_data['status'])) {
            foreach($request_data['status'] as $beckenid => $status){
                $beckenid = \numbersOnly($beckenid);
                $status = \numbersOnly($status);

                $logger->debug("request: status $beckenid $status");
                if (! \badOwnsBecken($con, $badid, $beckenid)){
                    throw new RestException(401,"Nope! Bad User! Can only modify own resources.");
                }

                $sql = "UPDATE becken SET status = $1 WHERE id = $2";
                \fbexecute($con, $sql, array($status, $beckenid));
            }
        }

        \apcu_delete("wwapi.v1.bad.get.badid.$badid");
        \apcu_delete("wwapi.v1.bad.get.badid.$badid_text");
        \apcu_delete("wwapi.v1.temperature.all_current");
    }

}

?>
