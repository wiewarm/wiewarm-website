<?

 // still needed? not working like this in any case
  
  function checkCanGzip() {
    if (headers_sent()) return 0;
    if (strpos($_SERVER["HTTP_ACCEPT_ENCODING"], 'x-gzip') !== false) return "x-gzip";
    if (strpos($_SERVER["HTTP_ACCEPT_ENCODING"],'gzip') !== false) return "gzip";
    return 0;
  }
  
  $isFull = ($_REQUEST['type'] == 'full'); 
 
  if ($encoding = checkCanGzip()) {
    // if  non match vergleichen und dann senden 
    header("Content-Encoding: $encoding");
    header("Content-type: text/xml");
    if ( $isFull ) $file = '/home/wiewarm/public_html/cache/xmlCacheFull.xml.gz';
    else           $file = '/home/wiewarm/public_html/cache/xmlCache.xml.gz';
    $fs = stat($file);
    header("Etag: ".sprintf('"%x-%x-%s"', $fs['ino'], $fs['size'],base_convert(str_pad($fs['mtime'],16,"0"),10,16)));
    $handle = fopen($file, "r");
    $content = fread($handle, filesize($file));
    echo $content;
    fclose($handle);
  } else {
    header("Content-type: text/xml");
    if ( $isFull ) $file = '/home/wiewarm/public_html/cache/xmlCacheFull.xml';
    else $file = '/home/wiewarm/public_html/cache/xmlCache.xml';
    $handle = fopen($file, "r");
    $content = fread($handle, filesize($file));
    echo $content;
    fclose($handle);
  }

?>
