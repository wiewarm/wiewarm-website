<?

/*
  Skript für Synchronisatzion mit mySwitzerland.com


  Die URL zum Erfassen der SOSPO Daily-Werte lautet:
  http://sospo.stnet.ch/requests/updatedaily.jsp?id=999&L=15&B=20&F=18&S=18

  id=key des Bades (wird vom System generiert)
  L=Lufttemperatur
  B=Bassintemperatur
  F=Flusstemperatur
  S=Seetemperatur

*/

  // Author: Christian Kaufmann

include("base.inc.php");

$stTypen = array(1 => 'B', 2 => 'F', 3 => 'S');

$qry = $badDB->runQuery('select BECKENID, STBADID, STTYP, WERT from BECKEN B ' .
                        'left join TEMPERATUR T on B.ID = T.BeckenId and t.Id = (select max(Id) from Temperatur where BeckenId = b.Id) ' .
                        'where B.STBADID > 0 and (not T.WERT is null) and (T.STSTATUS is null or T.STSTATUS = 0)');

$baeder = array();

while ($row = $badDB->nextRecordFromQry($qry) ) {
  if ( ! array_key_exists($row->getAsNumber('STBADID'), $baeder) )
  $baeder[$row->getAsNumber('BECKENID')] = array($row->getAsNumber('STBADID'), $row->getAsNumber('STTYP'), round($row->getAsNumber('WERT') / 10));
  
} // while


header('Content-Type: text/plain');

$bAareMarzili = FALSE;

print_r($baeder);

foreach ($baeder as $bad) {
    
  $stBadId = $bad[0];
  $stTyp = $bad[1];
  $wert = $bad[2];
        
  #$url = 'http://sospo.stnet.ch/requests/updatedaily.jsp?id=' . $stBadId . '&' . $stTypen[$stTyp] . '=' . $wert;
  $url = 'https://st.stnet.ch/sospo/pages/UpdateDaily.jsf?id=' . $stBadId . '&' . $stTypen[$stTyp] . '=' . $wert;


  // Spezialfall Marzili (stBadId = 30). Dort für Fluss noch Aare (beckenid=52) hinzufügen
  if ( ($stBadId == 30) AND ($bAareMarzili = FALSE) ) {
    $url .= '&F=' . round($badDB->queryForValue('select WERT from TEMPERATUR where BECKENID=52 order by DATUM desc', 'WERT') / 10);
    $bAareMarzili = TRUE;
  }


  echo "update:" . $url . "\n";

  $url . "\n";
  
  $data = file($url);

  //echo $url . "\n";
} // foreach

$badDB->runQuery('update TEMPERATUR set STSTATUS = 1 where (STSTATUS is null or STSTATUS = 0)');
$badDB->commit();


$badDB->close();

?>
