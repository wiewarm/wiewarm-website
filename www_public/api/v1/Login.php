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

    /**
     * Change the password for a BAD
     *
     * Requires the current pincode. Always stores a freshly salted SHA-512
     * crypt hash, matching infra/cryptpw.php.
     * <pre>request_data := {badid: b, pincode: currentPassword, new_password: newPassword}</pre>
     *
     * @url PUT password
     * @return mixed
     */
    function putPassword($request_data){
        if (!is_array($request_data)
            || !isset($request_data['badid'], $request_data['pincode'], $request_data['new_password'])
            || !(is_int($request_data['badid']) || is_string($request_data['badid']))
            || !preg_match('/^[1-9][0-9]*$/D', (string) $request_data['badid'])
            || !is_string($request_data['pincode'])
            || !is_string($request_data['new_password'])
            || $request_data['new_password'] === ''
            || strpos($request_data['pincode'], "\0") !== false
            || strpos($request_data['new_password'], "\0") !== false) {
            throw new RestException(400, "Expected badid, pincode and a non-empty new_password");
        }

        $badid = $request_data['badid'];
        if (!\pincodeCheck($badid, $request_data['pincode'])) {
            throw new RestException(401, "Nope! Bad User!");
        }

        $salt = substr(strtr(base64_encode(random_bytes(16)), '+', '.'), 0, 16);
        $hash = crypt($request_data['new_password'], '$6$rounds=5000$' . $salt . '$');
        if (!is_string($hash) || substr($hash, 0, 3) !== '$6$') {
            throw new RestException(500, "Password hashing failed");
        }

        $con = \pconnect();
        // Do not use query(): it logs positional parameters, including the hash.
        $result = pg_query_params($con,
            'UPDATE bad SET password_hash = $1 WHERE id = $2 RETURNING id',
            array($hash, $badid));
        if (!$result) {
            throw new RestException(500, "Password update failed");
        }
        if (pg_num_rows($result) !== 1) {
            throw new RestException(404, "Bad not found");
        }

        return array("success" => "OK");
    }

}

?>
