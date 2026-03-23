<?php

// this is here to make old wiewarm.ch/badDetail.php links still work

$id = $_GET['id'];
header("HTTP/1.1 301 Moved Permanently");

if ($id){
    header("Location: http://www.wiewarm.ch/#!/bad/$id");
}else{
    header("Location: http://www.wiewarm.ch/#!/start");
}
?> 
