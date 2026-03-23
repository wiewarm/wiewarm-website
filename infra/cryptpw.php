<?php

if (!isset($argv[1])) {
    fwrite(STDERR, "Usage: php cryptpw.php <password>\n");
    exit(1);
}

function randomCryptSalt($length = 16) {
    $raw = base64_encode(random_bytes($length));
    $salt = strtr(rtrim($raw, '='), '+', '.');
    return substr($salt, 0, $length);
}

$salt = '$6$rounds=5000$' . randomCryptSalt() . '$';
$hash = crypt($argv[1], $salt);
echo $hash . "\n";

?>
