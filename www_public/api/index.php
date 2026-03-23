<?php
require_once 'shared.php';
require_once 'lib/restler.php';

use Luracast\Restler\Defaults;
use Luracast\Restler\Restler;

Defaults::$useUrlBasedVersioning = true;

$r = new Restler();
$r->setAPIVersion(1);
$r->setSupportedFormats('JsonFormat', 'UploadFormat', 'YamlFormat');
$r->addAPIClass('Luracast\\Restler\\Resources');
$r->addAPIClass('Temperature'); 
$r->addAPIClass('Bad'); 
$r->addAPIClass('News'); 
$r->addAPIClass('Login'); 
$r->addAPIClass('Image'); 
$r->handle(); 

?>
