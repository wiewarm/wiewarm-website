<?
  // --------------------------------------------------------------------------
  //
  // Author : Marcel Hadorn
  // Was    : Parser fuer Wassertemperaturen vom BWG
  // Date   : 25.05.2003
  //
  // --------------------------------------------------------------------------

  include('base.inc.php');

  define(MY_SW_BATH_URL, 'http://sospo.stnet.ch/XmlBath.jsp?bathId=');

  // Start Funktionen fuers Parsing
  
  $lastAttributeId = '';
  $lastData = '';
  
  $attributes = array();
  $attributes['NAME'] = array();
  $attributes['VALUE']= array();

  function startElement($parser, $name, $attribs) {
    global $lastAttributeId, $lastData;
    if ( $name == 'ATTRIBUTE' ) $lastAttributeId = $attribs['ID'];
    if ( $name == 'VALUE' ) $lastData = 'VALUE';
    if ( $name == 'NAME' ) $lastData = 'NAME';
  } // startElement

  function endElement($parser, $name) {
    global $lastData, $lastAttributeId;
    $lastData = '';
    if ( $name == 'ATTRIBUTE') $lastAttributeId = '';
  } // endElement

  function characterData($parser, $data) {
    global $lastData, $lastAttributeId, $attributes;
    if ( $lastData and $lastAttributeId ) $attributes[$lastData][$lastAttributeId] = $data;
  }  //characterData

  // Ende Funktionen fuers Parsing


  function getLastDateTime($beckenId) {
    global $badDB;
    //$qry = $badDB->runQuery("select max(DATUM) as DMAX from TEMPERATUR where BECKENID = $beckenId");
    $qry = $badDB->runQuery("select NEWEST_DATUM from Becken where ID = $beckenId");
    $data = $badDB->nextRecordFromQry($qry);
    echo date("j.n.Y H:i:s", $data->getAsTimestamp('NEWEST_DATUM')) . " (ts ww)<br>";
    return ($data->getAsTimestamp('NEWEST_DATUM'));

  } // getLastDateTime
  

  // prüft ob Wert geändert hat und fügt eine Temperatur ein  
  function checkForInsert($badmeisterId, $beckenId, $temperature, $changed) {
    global $badDB;
    $tmp = explode(' ', $changed);
    $datum = explode('.', $tmp[0]);
    $zeit  = explode(':', $tmp[1]);
    $changed = mktime($zeit[0], $zeit[1], 0, $datum[1], $datum[0], $datum[2]);
    echo date("j.n.Y H:i:s", $changed) . " (ts mych)<br>";
    
    if ( ($changed-1800) > getLastDateTime($beckenId) && $temperature > 0) {
      wiewarmInsertTemperaturFromMySwitzerland($beckenId, $badmeisterId, $changed, $temperature);
      echo '<b>Pool ID=' . $beckenId . ' Temp mych: '. $temperature  . ' updated</b><br>';     
    } else {
        echo '<i>Pool ID=' . $beckenId . ' Temp mych: '. $temperature  . ' not updated</i><br>';     
    }
  } // checkForInsert


  function getOneBath($mySwitzerlandID) {
    global $attributes;
    
    $attributes = array();
    $attributes['NAME'] = array();
    $attributes['VALUE']= array();

    $xml_parser = xml_parser_create();
    xml_set_element_handler($xml_parser, "startElement", "endElement");
    xml_set_character_data_handler($xml_parser, "characterData");
    if (!($fp = fopen(MY_SW_BATH_URL . $mySwitzerlandID, "r"))) {
      die("could not open XML input");
    } 
    else {
      while ($data = fread($fp, 4096)) {
        if (!xml_parse($xml_parser, $data, feof($fp))) {
          die(sprintf("XML error: %s at line %d",
          xml_error_string(xml_get_error_code($xml_parser)),
          xml_get_current_line_number($xml_parser)));
        }
      } // while
    }
    xml_parser_free($xml_parser);
    
    // Folgender Code für Ausgabe was in Demofile getFromMySwitzerland.htm drin ist
        $werte = array('bathName', 'city', 'poolWaterTemperature', 'riverWaterTemperature', 'lakeWaterTemperature', 'modificationTimestamp');
        //foreach ($werte as $wert )
        //  echo $wert . ': ' . $attributes['NAME'][$wert] . '; ' . $attributes['VALUE'][$wert] . '<br>';
        return $attributes;

    
  } // getOneBath

  $stTypNamen = array( '1' => 'poolWaterTemperature',
                       '2' => 'riverWaterTemperature',
                       '3' => 'lakeWaterTemperature');
 
  // Alle Becken holen die synchronisiert werden
  global $badDB;
  $pools = array();
  $i = 0;
  $becken_qry = $badDB->runQuery("SELECT ID, BADID, STBADID, STTYP FROM BECKEN WHERE STBADID != 0 AND ID <> 433");
  while ($becken = $badDB->nextRecordFromQry($becken_qry)) {
    $pools[$i]["beckenId"] = $becken->getAsInteger('ID');
    $pools[$i]["badId"]    = $becken->getAsInteger('BADID');
    $pools[$i]["stBadId"]  = $becken->getAsInteger('STBADID');
    $pools[$i]["stTyp"]    = $stTypNamen[$becken->getAsInteger('STTYP')];
    $i++;
  }
 
  for ($i=0; $i< count($pools); $i++) {
    //Einen Badmeister holen
    $badId = $pools[$i]['badId'];
    $beckenId = $pools[$i]['beckenId'];
    $badmeister_qry = $badDB->runQuery("SELECT ID FROM BADMEISTER WHERE BADID=$badId");
    $badmeister_data = $badDB->nextRecordFromQry($badmeister_qry);
    $badmeisterId = $badmeister_data->getAsInteger('ID');
    
    //Daten von ST holen
    $data = getOneBath($pools[$i]['stBadId']);
    echo "Badname mych: " . $data['VALUE']['bathName'] . ' Ort: ' . $data['VALUE']['city'] . '<br>';
    echo "mych Bad-ID: " . $pools[$i]['stBadId'] . "</br>"; 
    echo "Temperatur mych: " . $data['VALUE'][$pools[$i]['stTyp']] . '<br>';
    checkForInsert($badmeisterId, $beckenId, $data['VALUE'][$pools[$i]['stTyp']], $data['VALUE']['modificationTimestamp']);
    echo "<hr noshade>";
  }

  $badDB->close();

?>
