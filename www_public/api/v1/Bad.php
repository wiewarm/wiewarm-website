<?php

namespace v1;
require_once("Log.php");
require_once(__DIR__ . "/../shared.php");
use \Luracast\Restler\RestException;

class Bad {

    private $con;

    function __construct(){
       
        global $logger; 
        $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'Bad.php');

    }


    /**
     * Get a complete BAD object
     *
     * Get a complete BAD object, including all BECKEN plus the most recent temperature
     *
     * @param mixed $badid Numeric id of BAD
     *
     * @return mixed
     */
    function get($badid){
        global $logger;
        $logger->debug("get() called with badid: " . print_r($badid, true));

        $cacheKey = "wwapi.v1.bad.get.badid.$badid";

        $fetchFunction = function($badid){
            global $logger;

            try {
                if (is_numeric($badid)){
                    $badid_is_textual = false; 
                    $badid = \numbersOnly($badid);
                }else{
                    $badid_is_textual = true; 
                    $badid = \textidOnly($badid);
                }

                $logger->debug("Processed badid: " . $badid . " (textual: " . ($badid_is_textual ? "yes" : "no") . ")");
                
                $con = \pconnect();
                if (!$con) {
                    throw new \Exception("Failed to connect to database");
                }

                $sql = "
                    select b.id as badid, 
                        b.name as badname, 
                        kanton, 
                        plz, 
                        ort,
                        adresse1,
                        adresse2,
                        email,
                        telefon,
                        www,
                        ortlong as long,
                        ortlat as lat,
                        zeiten,
                        preise, 
                        info,
                        wetterort,
                        uvs.name as uv_station_name,
                        uvs.newest_wert as uv_wert,
                        uvs.newest_datum as uv_date
                    from bad b
                    left join uvstation uvs on b.uvstationid = uvs.uvstationid
                    join bad_textual_id btid on b.id = btid.id
                    where " . ($badid_is_textual ? "btid.textual_id = $1" : "b.id = $1");

                $logger->debug("Executing query with badid $badid: " . $sql);
                
                $sth = \query($con, $sql, array($badid));
                $bad = \fetch_assoc($sth);
                
                if (!$bad) {
                    $logger->err("No results found for badid: $badid");
                    throw new RestException(404, "Bad with ID $badid not found");
                }

                $logger->debug("Found bad: " . print_r($bad, true));
                
                $bad = array_change_key_case($bad, CASE_LOWER);

                $bad['uv_date_pretty'] = $bad['uv_date'] ? 
                            preg_replace("/^\d{4}-(\d\d)-(\d\d).*/", "$2.$1.", $bad['uv_date']) : null;

                // Initialize empty arrays
                $bad['becken'] = array();
                $bad['bilder'] = array();
                $bad['infos'] = array();
                $bad['wetter'] = array();

                // rest of code uses numeric id in any case
                $badid = $bad['badid'];

                /*

                $sql = "
                    select
                        id as beckenid, 
                        name as beckenname, 
                        newest_temp / 10.0 as temp,
                        newest_datum as \"date\",
                        kt.bezeichnung as \"typ\", 
                        ks.bezeichnung as status,
                        smskeywords,
                        smsname,
                        ismain 
                    from becken bk 
                    left join katalog kt on typ = kt.itemid and kt.gruppe = 1
                    left join katalog ks on status = ks.itemid and ks.gruppe = 2
                    where badid = $badid 
                    order by name";
                */

                $sql = "
                    select
                        bk.id as beckenid, 
                        case when s1.name_unique = 1 then bk.name else kt.bezeichnung || ' ' ||  bk.name end as beckenname, 
                        ROUND(CAST(bk.newest_temp::float / 10.0 AS numeric), 1)::text as temp,
                        bk.newest_datum as date,
                        kt.bezeichnung as typ, 
                        ks.bezeichnung as status,
                        bk.smskeywords,
                        bk.smsname,
                        bk.ismain
                    from becken bk 
                    left join katalog kt on bk.typ = kt.itemid and kt.gruppe = 1
                    left join katalog ks on bk.status = ks.itemid and ks.gruppe = 2
                    left join (
                        select bk2.badid, bk2.name, count(*) as name_unique from becken bk2 
                        group by bk2.badid, bk2.name
                    ) s1 on bk.badid = s1.badid and bk.name = s1.name
                    where bk.badid = $badid 
                    order by 5, 2";
                  

                $logger->debug("Query: $sql");
                $sth = \query($con, $sql);

                while ($becken = \fetch_assoc($sth)){
                    $becken = array_change_key_case($becken, CASE_LOWER);
                    $becken['date_pretty'] = \date_pretty($becken['date']);
                    $bad['becken'][$becken['beckenname']] = $becken;
                }

                #$img = glob("/vol1/home/wiewarm/public_html/img/baeder/$badid/*.jpg");
                #$imginfo = array();
                #foreach($img as $i){
                #    $refname = preg_replace("/.*public_html\//", "", $i);
                #    $txt = file_get_contents(preg_replace("/\.jpg/", ".txt", $i));
                #    $imginfo[] = array("image" => $refname, "text" =>  $txt ? $txt : "");
                #}

                $bad['bilder'] = \imagelist($badid);

                // Update to PostgreSQL syntax
                $sql = "SELECT i.datum AS date, i.info 
                       FROM infos i 
                       WHERE i.badid = $1
                       AND i.datum >= CURRENT_DATE - INTERVAL '31 days'
                       ORDER BY 1 DESC
                       LIMIT 4";
                
                $logger->debug("Info SQL: ". print_r($sql, true));

                $sth = \query($con, $sql, array($badid));

                while ($info = \fetch_assoc($sth)){
                    $logger->debug("Info: ". print_r($info, true));
                    $info = array_change_key_case($info, CASE_LOWER);
                    $info['date_pretty'] = \date_pretty($info['date']);
                    $bad['infos'][] = $info;
                }

                $ort = $bad['wetterort'];

                // Update to PostgreSQL syntax
                $sql = "SELECT symbolid as wetter_symbol, 
                              ROUND(CAST(temperatur::float / 10.0 AS numeric), 1)::text as wetter_temp, 
                              datum as wetter_date
                       FROM wetter w
                       WHERE w.ort = $1 
                       ORDER BY datum DESC
                       LIMIT 2";
                
                $logger->debug("Wetter SQL: ". print_r($sql, true));

                $sth = \query($con, $sql, array($ort));

                while ($wetter = \fetch_assoc($sth)){
                    $wetter = array_change_key_case($wetter, CASE_LOWER);
                    $wetter['wetter_date_pretty'] = 
                            preg_replace("/^\d{4}-(\d\d)-(\d\d).*/", "$2.$1.", $wetter['wetter_date']);
                    $bad['wetter'][] = $wetter;
                }

                return $bad;
            } catch (\Exception $e) {
                $logger->err("Error in get(): " . $e->getMessage());
                throw new RestException(500, "Database error: " . $e->getMessage());
            }
        };

        try {
            $cacheValue = \apc_wrapper($cacheKey, $fetchFunction, $badid, 300, true);
            return $cacheValue;
        } catch (\Exception $e) {
            $logger->err("Error in get() cache wrapper: " . $e->getMessage());
            throw new RestException(500, "Server error: " . $e->getMessage());
        }
    }

    /**
     * Update BAD
     *
     * Allows update of the following fields of BAD: 
     * <pre>addresse1, adresse2, plz, ort, telefon, email, zeiten, preise, info</pre>
     *
     * Body must contain the badid and pincode members.
     *
     *
     * @param $request_data 
     *
     * @return mixed
     */
    function put($request_data){

        global $logger;
        $con = \pconnect();
        $logger->debug("put rq:" . print_r(\sanitizeLogContext($request_data), true));

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

        // Update to PostgreSQL syntax
        $sql = "UPDATE bad SET 
                adresse1 = $1, 
                adresse2 = $2, 
                plz = $3, 
                ort = $4, 
                telefon = $5, 
                email = $6, 
                zeiten = $7, 
                preise = $8, 
                info = $9 
                WHERE id = $10";

        $bind = array($request_data['adresse1'], 
                     $request_data['adresse2'], 
                     $request_data['plz'], 
                     $request_data['ort'], 
                     $request_data['telefon'], 
                     $request_data['email'], 
                     $request_data['zeiten'], 
                     $request_data['preise'], 
                     $request_data['info'], 
                     $badid);

        $rv = \fbexecute($con, $sql, $bind);

        \apcu_delete("wwapi.v1.bad.get.badid.$badid");
        \apcu_delete("wwapi.v1.bad.get.badid.$badid_text");

    }

    /**
     * Get a list of BAD
     *
     * Get a list of BAD according to search criteria
     *
     * @param mixed $search Search string, case insensitive
     *
     * @return mixed
     */
    function index($search = ""){

        global $logger;

        $cacheKey = "wwapi.v1.bad.index";

        $fetchFunction = function($ignored){

            global $logger;
            $con = \pconnect();

            $sql = "
                select
                    id as beckenid, 
                    badid,
                    name as beckenname, 
                    ROUND(CAST(newest_temp::float / 10.0 AS numeric), 1)::text as temp,
                    newest_datum as date,
                    kt.bezeichnung as typ, 
                    ks.bezeichnung as status,
                    smskeywords,
                    smsname,
                    ismain 
                from becken bk 
                join katalog kt on typ = kt.itemid and kt.gruppe = 1
                join katalog ks on status = ks.itemid and ks.gruppe = 2
                order by badid, newest_datum";
              

            $logger->debug("Query: $sql");
            $sth = \query($con, $sql);
            $becken = array();

            while ($row = \fetch_assoc($sth)){
                $row = array_change_key_case($row, CASE_LOWER);
                $row['date_pretty'] = \date_pretty($row['date']);
                $becken[$row['badid']][$row['beckenname']] = $row;

            }


            $sql = "
                select b.id as badid, 
                    b.name as badname, 
                    btid.textual_id as badid_text, 
                    kanton, 
                    plz, 
                    ort,
                    adresse1,
                    adresse2,
                    ortlong as \"long\",
                    ortlat as \"lat\"
                    from bad b 
                    join bad_textual_id btid on b.id = btid.id
                    order by ort, badname";

            $sth = \query($con, $sql);
            $records = array();

            while ($row = \fetch_assoc($sth)){
                $row = array_change_key_case($row, CASE_LOWER);
                $bi = $row['badid']; 
                $row['becken'] = $becken[$bi] ?? null;
                $records[] = $row;
            }

            return $records;


        };

        $cacheValue = \apc_wrapper($cacheKey, $fetchFunction, "", 600);

        $matches = $this->match($cacheValue, $search);

        return $matches;
    }

    private function match($input, $searchterm){
        global $logger;
        $matches = array();
        $logger->debug("search: " . print_r($searchterm, true));

        if ($searchterm == "__latest__"){
            return $this->matchlatest($input, $searchterm);
        }else if ($searchterm == "__all__"){
            return $input;
        }else{
            // Ensure searchterm is a string
            $searchterm = is_array($searchterm) ? '' : (string)$searchterm;
            $searchtokens = preg_split("/\s+/", $searchterm);
            $logger->debug("st:" . print_r($searchtokens, true));

            foreach($input as $row){
                $compareelem = array_intersect_key($row, 
                    array('badname' => 1, 'plz' => 1, 'ort' => 1, 'kanton' => 1));

                $comparestr = implode(" ", array_values($compareelem));

                //$logger->debug("comparestr: $comparestr vs $searchterm");

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
        }
    
        return $matches;
    }


    private function matchlatest($input, $searchterm){
       
        global $logger;
        $matches = array();
        $logger->debug("search: $searchterm");

        $fetchFunction = function($ignored){
            $con = \pconnect();
            // Update to PostgreSQL syntax
            $sql = "SELECT id, badid, newest_datum 
                   FROM becken 
                   ORDER BY newest_datum DESC 
                   LIMIT 30";
            $sth = \query($con, $sql);
            $mostrecentids = array();
            
            while ($row = \fetch_assoc($sth)){
                $row = array_change_key_case($row, CASE_LOWER);
                $mostrecentids[$row['badid']]++;
            }

            $badids = array_keys($mostrecentids);
            return $badids;
        };


        $badids = \apc_wrapper("wwapi.v1.bad.mostrecentids", $fetchFunction, "", 300);
        $logger->debug("fetch done");
        $maxrec = count($badids) > 5 ? 5 : count($badids);
        $minilieblingsbadi = $_COOKIE['minilieblingsbadi'];
        $logger->debug("fav: " . $minilieblingsbadi);


        if ($minilieblingsbadi >= 1){
            $badids = array_filter($badids, function($v){global $minilieblingsbadi; return ($v != $minilieblingsbadi);});
            array_unshift($badids, $minilieblingsbadi);
        }

        for($i = 0; $i < $maxrec; $i++){
            $badid = $badids[$i]; 
            foreach ($input as $row){
                if ($row['badid'] == $badid){
                    $matches[] = $row; 
                    break;
                }     
            }
        }

        return $matches;

    }
}

?>
