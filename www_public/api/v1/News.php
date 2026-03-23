<?php

namespace v1;
require_once("Log.php");
require_once(__DIR__ . "/../shared.php");
use \Luracast\Restler\RestException;

class News {

    private $con;

    function __construct(){
       
        global $logger; 
        $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'News.php');
    }

    /**
     * Get the the most recent news items of any BAD
     *
     * Get the the most recent news items available (of any BAD), up to 90 days in the past.
     *
     * @param mixed $search Search keywords against badname, ort, plz, canton, info text
     * @param mixed $badid Limit results to badid
     *
     * @return mixed
     */
    function index($search = "__latest__", $badid = ""){
        global $logger;

        $cacheKey = $badid ? "wwapi.v1.news.recent.$badid" : "wwapi.v1.news.recent";

        $fetchFunction = function($badid){
            global $logger;
            $con = \pconnect();

            $where = "i.datum >= CURRENT_DATE - INTERVAL '90 days'"; 

            if ($badid){
                $badid = \numbersOnly($badid);
                $where .= " AND b.id = $1"; 
                $params = array($badid);
            } else {
                $params = array();
            }

            $sql = "SELECT i.badid, 
                b.name AS badname, 
                b.ort, 
                b.kanton, 
                b.plz, 
                i.id AS infoid, 
                TO_CHAR(i.datum, 'YYYY-MM-DD HH24:MI:SS') AS date,
                i.info 
                FROM infos i 
                JOIN bad b ON i.badid = b.id 
                WHERE $where 
                ORDER BY i.datum DESC";

            $logger->debug("Query: $sql");
            
            $sth = \query($con, $sql, $params);
            if (!$sth) {
                return array('Error PG:', pg_last_error($con));
            }
            
            $rows = array(); 
            while ($row = \fetch_assoc($sth)){
                $row['date_pretty'] = \date_pretty($row['date']);
                $rows[] = $row;
            }

            return $rows;
        };

        $cacheValue = \apc_wrapper($cacheKey, $fetchFunction, $badid);
        return $this->match($cacheValue, $search);
    }

    private function match($input, $searchterm){
        global $logger;
        global $__latest__records;

        $matches = array();
        $logger->debug("search: $searchterm");

        if ($searchterm == "__latest__"){
            return array_slice($input, 0, $__latest__records);
        }else if ($searchterm == "__all__"){
            return $input;
        }else{
            $searchtokens = preg_split("/\s+/", $searchterm);
            $logger->debug("st:" . print_r($searchtokens, true));

            foreach($input as $row){
                $compareelem = array_intersect_key($row, 
                    array('badname' => 1, 'plz' => 1, 'ort' => 1, 'kanton' => 1, 'info' => 1 ));

                $comparestr = implode(" ", array_values($compareelem));

                $logger->debug("comparestr: $comparestr vs $searchterm");

                $match = true;
                foreach($searchtokens as $tok){
                    $logger->debug("comparestr: $comparestr vs $tok");
                    if (stristr($comparestr, $tok)){
                        $logger->debug("cont");
                        continue;
                    }else{
                        $logger->debug("break");
                        $match = false; 
                        break;
                    }
                }

                if ($match){
                    $matches[] = $row; 
                    $logger->debug("match " . print_r($comparestr, true));
                }
            }

            return $matches;
        }
    }

    /**
     * Get the the 10 most recent news items of any BAD
     *
     * Get the the 10 most recent news items available (of any BAD)
     *
     * @return mixed
     */
    function getlegacydeleteme(){
        global $logger;

        $cacheKey = "wwapi.v1.news.recent";

        $fetchFunction = function($ignored){

            global $logger;
            $con = \pconnect();

            $where = "1 = 1"; 

            $sql = "SELECT i.badid, 
                b.name as badname, 
                b.ort, 
                b.kanton, 
                b.plz, 
                i.datum as date, 
                i.info 
                FROM infos i 
                JOIN bad b ON i.badid = b.id 
                WHERE $where 
                ORDER BY date DESC 
                LIMIT 10";

            $logger->debug("Query: $sql");
            
            $sth = \query($con, $sql);
       
            if (! $sth){
                return (array('Error PG:', pg_last_error($con)));
            }
            
            $rows = array(); 
            while ($row = \fetch_assoc($sth)){
                $row['date_pretty'] = \date_pretty($row['date']);
                $rows[] = $row;
            }

            return $rows;
        };

        $cacheValue = \apc_wrapper($cacheKey, $fetchFunction, $badid);
        return $cacheValue;
    }

    /**
     * Submit a new entry
     *
     * Submit a new entry for a BAD.
     * <pre>request_data := {badid: b, pincode: p, info: text}</pre>
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
        $pincode = $request_data['pincode'];
        $info = $request_data['info'];

        if (!\pincodeCheck($badid, $pincode)){
            throw new RestException(401,"Nope! Bad User!");
        }

        if (!$info){
            throw new RestException(401,"Empty info field, fuck that.");
        }

        $sql = "INSERT INTO infos (id, badid, badmeisterid, datum, info) VALUES (
            nextval('gen_infos'),
            $1,
            (SELECT id FROM badmeister WHERE badid = $2 LIMIT 1),
            CURRENT_TIMESTAMP,
            $3
        )";

        $rc = \fbexecute3($con, $sql, $badid, $badid, $info);

        \apcu_delete("wwapi.v1.bad.get.badid.$badid");
        \apcu_delete("wwapi.v1.news.recent.$badid");
        \apcu_delete("wwapi.v1.news.recent");

        return "OK $rc";
    }

    /**
     * Delete a News entry
     *
     * Delete a News entry via infoid
     *
     * @return mixed
     */
    function delete($badid, $pincode, $infoid){
        global $logger;
        $con = \pconnect();
        $logger->debug("delete news: $badid $infoid");

        $badid = \numbersOnly($badid);

        if (!\pincodeCheck($badid, $pincode)){
            throw new RestException(401,"Nope! Bad User!");
        }

        $infoid = \numbersOnly($infoid);

        $sql = "DELETE FROM infos WHERE badid = $1 AND id = $2";
        $rc = \fbexecute($con, $sql, array($badid, $infoid));

        \apcu_delete("wwapi.v1.bad.get.badid.$badid");
        \apcu_delete("wwapi.v1.news.recent.$badid");
        \apcu_delete("wwapi.v1.news.recent");

        return array("success" => "OK");
    }
}
?>
