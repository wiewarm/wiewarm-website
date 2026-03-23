<?php

declare(strict_types=1);

/**
 * Export wiewarm-data CSV files directly from PostgreSQL (no API usage).
 *
 * Output schema:
 * datum;badid;bad;adresse1;adresse2;ort;plz;kanton;beckenid;becken;typ;temperatur
 *
 * Usage:
 *   php exportWiewarmDataCsv.php --out-dir=/tmp/wiewarm-data
 *
 * Environment variables:
 *   POSTGRES_HOST (default: ci-postgres)
 *   POSTGRES_PORT (default: 5432)
 *   POSTGRES_DB   (required)
 *   POSTGRES_USER (required)
 *   POSTGRES_PASSWORD (required)
 */

function usage(): void
{
    $msg = <<<TXT
Export yearly CSV files from PostgreSQL.

Required env vars:
  POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

Optional flags:
  --out-dir=<path>        Output directory (default: ./wiewarm-data-export)
  --year=<YYYY>           Year to export (default: max year in data)

Example:
  POSTGRES_DB=wiewarm POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres \\
  php exportWiewarmDataCsv.php --out-dir=/tmp/wiewarm-data --year=2025
TXT;

    fwrite(STDOUT, $msg . PHP_EOL);
}

function fail(string $message, int $code = 1): void
{
    fwrite(STDERR, "ERROR: {$message}" . PHP_EOL);
    exit($code);
}

$options = getopt('', ['out-dir::', 'year::', 'help']);

if (isset($options['help'])) {
    usage();
    exit(0);
}

$outDir = $options['out-dir'] ?? (__DIR__ . '/wiewarm-data-export');
$yearOption = isset($options['year']) ? (int) $options['year'] : null;

$host = getenv('POSTGRES_HOST') ?: 'ci-postgres';
$port = getenv('POSTGRES_PORT') ?: '5432';
$db = getenv('POSTGRES_DB') ?: '';
$user = getenv('POSTGRES_USER') ?: '';
$password = getenv('POSTGRES_PASSWORD') ?: '';

if ($db === '' || $user === '' || $password === '') {
    fail('Missing required env vars: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD');
}

$connStr = sprintf('host=%s port=%s dbname=%s user=%s password=%s', $host, $port, $db, $user, $password);
$conn = pg_connect($connStr);
if ($conn === false) {
    fail('Could not connect to PostgreSQL');
}

if (!is_dir($outDir) && !mkdir($outDir, 0775, true) && !is_dir($outDir)) {
    fail("Could not create output directory: {$outDir}");
}

$yearRangeSql = <<<SQL
SELECT
    MIN(EXTRACT(YEAR FROM t.datum))::int AS min_year,
    MAX(EXTRACT(YEAR FROM t.datum))::int AS max_year
FROM temperatur t
SQL;

$yearRangeResult = pg_query($conn, $yearRangeSql);
if ($yearRangeResult === false) {
    fail('Could not read year range from temperatur table');
}

$yearRange = pg_fetch_assoc($yearRangeResult);
if (!$yearRange || $yearRange['min_year'] === null || $yearRange['max_year'] === null) {
    fail('No temperatur data found');
}

$maxYear = (int) $yearRange['max_year'];

$year = $yearOption ?? $maxYear;

if ($year < (int) $yearRange['min_year'] || $year > $maxYear) {
    fail(sprintf('--year must be between %d and %d', (int) $yearRange['min_year'], $maxYear));
}

$header = [
    'datum',
    'badid',
    'bad',
    'adresse1',
    'adresse2',
    'ort',
    'plz',
    'kanton',
    'beckenid',
    'becken',
    'typ',
    'temperatur',
];

$exportSql = <<<SQL
SELECT
    TO_CHAR(t.datum, 'YYYY-MM-DD HH24:MI:SS') AS datum,
    b.id AS badid,
    b.name AS bad,
    COALESCE(b.adresse1, '') AS adresse1,
    COALESCE(b.adresse2, '') AS adresse2,
    COALESCE(b.ort, '') AS ort,
    COALESCE(b.plz, '') AS plz,
    COALESCE(b.kanton, '') AS kanton,
    bk.id AS beckenid,
    bk.name AS becken,
    COALESCE(kt.bezeichnung, '') AS typ,
    ROUND(CAST(t.wert AS numeric) / 10.0, 1)::text AS temperatur
FROM temperatur t
JOIN becken bk ON bk.id = t.beckenid
JOIN bad b ON b.id = bk.badid
LEFT JOIN katalog kt ON kt.gruppe = 1 AND kt.itemid = bk.typ
WHERE EXTRACT(YEAR FROM t.datum) = $1
ORDER BY t.datum ASC, b.id ASC, bk.id ASC
SQL;

$filePath = rtrim($outDir, '/')."/wiewarm-data-{$year}.csv";
$fh = fopen($filePath, 'wb');
if ($fh === false) {
    fail("Could not open file for writing: {$filePath}");
}

fputcsv($fh, $header, ';');

$result = pg_query_params($conn, $exportSql, [$year]);
if ($result === false) {
    fclose($fh);
    fail("Export query failed for year {$year}: " . pg_last_error($conn));
}

$rows = 0;
while ($row = pg_fetch_assoc($result)) {
    fputcsv($fh, [
        $row['datum'],
        $row['badid'],
        $row['bad'],
        $row['adresse1'],
        $row['adresse2'],
        $row['ort'],
        $row['plz'],
        $row['kanton'],
        $row['beckenid'],
        $row['becken'],
        $row['typ'],
        $row['temperatur'],
    ], ';');
    $rows++;
}

fclose($fh);

fwrite(STDOUT, sprintf("Exported %d rows to %s\n", $rows, $filePath));

fwrite(STDOUT, "Done.\n");
