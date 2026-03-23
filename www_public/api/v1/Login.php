<?php

namespace v1;
require_once("Log.php");
require_once(__DIR__ . "/../shared.php");
use \Luracast\Restler\RestException;

class Login {

    private $con;

    function __construct(){
       
        global $logger; 
        $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'Admin.php');

    }


    /**
     * Verify user credentials
     *
     * Verify user credentials using our highly secure quantum cryptography facility in Area 51
     *
     * @return OK or some error
     */

    function put($badid, $pincode){
        global $logger;

        if (pincodeCheck($badid, $pincode)){
            return array("success" => "OK");
        }else{
            throw new RestException(401,"Nope! Bad User!");
        }
    }

}

?>
