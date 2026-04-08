<?php

require_once('Log.php');
require_once(__DIR__ . '/api/shared.php');

global $logger;
$logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'xmlData.php');

function xmlLegacyComment() {
    return <<<XML
  Saemtliche Daten duerfen nur fuer nicht kommerzielle Zwecke verwendet werden und die Quelle
  www.wiewarm.ch ist immer anzugeben.
  Werden die Daten auf einer Internetseite veroeffentlicht, ist auf der entsprechenden Seite jeweils
  ein gut sichtbarer Link auf die Seite www.wiewarm.ch anzubringen.

  Die Daten von den meisten offenen Gewaessern stammen vom Bundesamt fuer Wasser und Geologie BWG
  http://www.bwg.admin.ch/
XML;
}

function xmlFormatChangedAt($timestamp) {
    if ($timestamp === null || $timestamp === '') {
        return '';
    }

    $date = date_create($timestamp);
    if (!$date) {
        return '';
    }

    if ($date->format('Y') === date('Y')) {
        return $date->format('j.n. - G:i');
    }

    return $date->format('j.n.Y');
}

function xmlValue($value) {
    $value = (string) ($value ?? '');
    $converted = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $value);
    if ($converted === false) {
        $converted = $value;
    }

    return htmlspecialchars($converted, ENT_COMPAT, 'ISO-8859-1');
}

function xmlFetchRows() {
    global $logger;

    $con = pconnect();
    $sql = "
        SELECT
            b.id AS badid,
            b.name AS badname,
            b.ort,
            COALESCE(b.plz, '') AS plz,
            b.kanton,
            COALESCE(b.adresse1, '') AS adresse1,
            COALESCE(b.adresse2, '') AS adresse2,
            bk.id AS beckenid,
            bk.name AS beckenname,
            ROUND(CAST(bk.newest_temp::float / 10.0 AS numeric), 1)::text AS temperatur,
            bk.newest_datum AS datum,
            EXTRACT(EPOCH FROM bk.newest_datum)::bigint::text AS changed,
            COALESCE(kt.bezeichnung, '') AS typ
        FROM bad b
        JOIN becken bk ON bk.badid = b.id
        LEFT JOIN katalog kt ON bk.typ = kt.itemid AND kt.gruppe = 1
        WHERE bk.newest_temp IS NOT NULL
        ORDER BY b.kanton, b.ort, b.name, bk.id";

    $logger->debug("xmlData query: $sql");
    $sth = query($con, $sql);

    $rows = array();
    while ($row = fetch_assoc($sth)) {
        $rows[] = array_change_key_case($row, CASE_LOWER);
    }

    return $rows;
}

function xmlBadOpenTag($row, $isFull) {
    $attrs = array(
        'id="' . xmlValue($row['badid']) . '"',
        'name="' . xmlValue($row['badname']) . '"',
        'ort="' . xmlValue($row['ort']) . '"',
        'plz="' . xmlValue($row['plz']) . '"',
        'kanton="' . xmlValue($row['kanton']) . '"',
    );

    if ($isFull) {
        $attrs[] = 'adresse1="' . xmlValue($row['adresse1']) . '"';
        $attrs[] = 'adresse2="' . xmlValue($row['adresse2']) . '"';
    }

    return '<BAD ' . implode(' ', $attrs) . ' >';
}

function xmlBeckenTag($row, $isFull) {
    $attrs = array(
        'id="' . xmlValue($row['beckenid']) . '"',
        'name="' . xmlValue($row['beckenname']) . '"',
        'temperatur="' . xmlValue($row['temperatur']) . '"',
        'geaendert="' . xmlValue(xmlFormatChangedAt($row['datum'])) . '"',
        'changed="' . xmlValue($row['changed']) . '"',
    );

    if ($isFull) {
        $attrs[] = 'typ="' . xmlValue($row['typ']) . '"';
    }

    return '<BECKEN ' . implode(' ', $attrs) . ' ></BECKEN>';
}

function xmlBuildDocument($rows, $isFull) {
    $lines = array();
    $lines[] = '<?xml version="1.0" encoding="ISO-8859-1"?>';
    $lines[] = '<!--';
    foreach (explode("\n", xmlLegacyComment()) as $line) {
        $lines[] = xmlValue($line);
    }
    $lines[] = '-->';
    $lines[] = '<WIEWARM created="' . date('Y-m-d\TH:i:s') . '">';

    $currentBadId = null;
    foreach ($rows as $row) {
        if ($row['badid'] !== $currentBadId) {
            if ($currentBadId !== null) {
                $lines[] = '  </BAD>';
            }
            $currentBadId = $row['badid'];
            $lines[] = xmlBadOpenTag($row, $isFull);
        }

        $lines[] = xmlBeckenTag($row, $isFull);
    }

    if ($currentBadId !== null) {
        $lines[] = '</BAD>';
    }
    $lines[] = '</WIEWARM>';

    return implode("\n", $lines) . "\n";
}

$isFull = isset($_REQUEST['type']) && $_REQUEST['type'] === 'full';

try {
    header('Content-Type: text/xml; charset=ISO-8859-1');
    echo xmlBuildDocument(xmlFetchRows(), $isFull);
} catch (Exception $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=UTF-8');
    }
    echo "xml generation failed\n";
}

?>
