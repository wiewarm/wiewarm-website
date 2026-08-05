<?php

declare(strict_types=1);

const METEOSWISS_BASE_URL = 'https://www.meteoschweiz.admin.ch';
const VERSIONS_URL = METEOSWISS_BASE_URL . '/product/output/versions.json';

date_default_timezone_set('Europe/Zurich');

function fail(string $message): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

function fetchJson(string $url): array
{
    $context = stream_context_create([
        'http' => [
            'header' => "Accept: application/json\r\nUser-Agent: wiewarm.ch UV index importer\r\n",
            'timeout' => 10,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        fail("Could not fetch $url");
    }

    try {
        $data = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        fail("Could not parse $url: " . $exception->getMessage());
    }

    if (!is_array($data)) {
        fail("Expected a JSON object from $url");
    }

    return $data;
}

function uvIndexUrl(): string
{
    $versions = fetchJson(VERSIONS_URL);
    $version = $versions['uv-index'] ?? null;

    if (!is_string($version) || !preg_match('/^\d{8}_\d{4}$/D', $version)) {
        fail('The MeteoSwiss UV index version is missing or invalid.');
    }

    return METEOSWISS_BASE_URL
        . '/product/output/uv-index/version__'
        . $version
        . '/de/today.json';
}

function valuesByUvOrt(array $data): array
{
    if (!isset($data['regions']) || !is_array($data['regions'])) {
        fail('The MeteoSwiss UV index response has no regions.');
    }

    $values = [];

    foreach ($data['regions'] as $region) {
        $regionName = $region['name'] ?? null;
        $dataPoints = $region['uvindex'] ?? null;

        if (!is_string($regionName) || !is_array($dataPoints)) {
            fail('A MeteoSwiss UV index region is invalid.');
        }

        foreach ($dataPoints as $dataPoint) {
            $level = $dataPoint['level'] ?? null;
            $height = $dataPoint['height'] ?? '';
            $uvOrt = $regionName;

            if ($height !== '') {
                if (!is_scalar($height) || !preg_match('/\d+$/D', $regionName)) {
                    fail("Could not derive the uvort key for region $regionName");
                }
                $uvOrt = preg_replace('/\d+$/D', (string) $height, $regionName);
            }

            if (!is_int($level) || isset($values[$uvOrt])) {
                fail("Invalid or duplicate UV index value for uvort $uvOrt");
            }

            $values[$uvOrt] = $level;
        }
    }

    return $values;
}

function connectToDatabase()
{
    if (!function_exists('pg_connect')) {
        fail('The PHP PostgreSQL extension is required.');
    }

    $host = getenv('POSTGRES_HOST') ?: 'localhost';
    $port = getenv('POSTGRES_PORT') ?: '5432';
    $database = getenv('POSTGRES_DB') ?: 'wiewarm';
    $user = getenv('POSTGRES_USER') ?: 'postgres';
    $password = getenv('POSTGRES_PASSWORD') ?: 'postgres';
    $connection = @pg_connect(
        "host=$host port=$port dbname=$database user=$user password=$password"
    );

    if ($connection === false) {
        fail('Could not connect to PostgreSQL.');
    }

    return $connection;
}

function updateDatabase($connection, array $values, string $timestamp): array
{
    if (pg_query($connection, 'BEGIN') === false) {
        fail('Could not start database transaction: ' . pg_last_error($connection));
    }

    $result = pg_query(
        $connection,
        'SELECT uvstationid, code, newest_datum FROM uvstation FOR UPDATE'
    );
    if ($result === false) {
        pg_query($connection, 'ROLLBACK');
        fail('Could not read UV stations: ' . pg_last_error($connection));
    }

    $stations = [];
    while ($station = pg_fetch_assoc($result)) {
        $stations[$station['code']] = $station;
    }

    $unknownUvOrte = array_diff(array_keys($values), array_keys($stations));
    if ($unknownUvOrte !== []) {
        pg_query($connection, 'ROLLBACK');
        fail('Unknown uvort key(s): ' . implode(', ', $unknownUvOrte));
    }

    $updated = 0;
    $skipped = 0;

    foreach ($values as $uvOrt => $level) {
        $station = $stations[$uvOrt];
        if ($station['newest_datum'] !== null && $station['newest_datum'] >= $timestamp) {
            $skipped++;
            continue;
        }

        $clearResult = pg_query_params(
            $connection,
            'UPDATE uvwert SET newest = false WHERE uvstationid = $1 AND newest = true',
            [$station['uvstationid']]
        );
        if ($clearResult === false) {
            pg_query($connection, 'ROLLBACK');
            fail("Could not clear old values for uvort $uvOrt: " . pg_last_error($connection));
        }

        $insertResult = pg_query_params(
            $connection,
            "INSERT INTO uvwert (uvwertid, uvstationid, wert, datum, newest)
             VALUES (nextval('gen_uvwert'), $1, $2, $3, true)",
            [$station['uvstationid'], $level, $timestamp]
        );

        if ($insertResult === false) {
            pg_query($connection, 'ROLLBACK');
            fail("Could not update uvort $uvOrt: " . pg_last_error($connection));
        }

        $updated++;
    }

    if (pg_query($connection, 'COMMIT') === false) {
        pg_query($connection, 'ROLLBACK');
        fail('Could not commit UV index updates: ' . pg_last_error($connection));
    }

    return [$updated, $skipped];
}

if (PHP_SAPI !== 'cli') {
    fail('This importer can only be run from the command line.');
}

$options = getopt('', ['url-only', 'dry-run']);
$url = uvIndexUrl();
echo $url . PHP_EOL;

if (isset($options['url-only'])) {
    exit(0);
}

$data = fetchJson($url);
$values = valuesByUvOrt($data);
$sourceTimestamp = $data['config']['timestamp'] ?? null;

if (!is_int($sourceTimestamp) || $sourceTimestamp <= 0) {
    fail('The MeteoSwiss UV index timestamp is missing or invalid.');
}

$timestamp = (new DateTimeImmutable('@' . $sourceTimestamp))
    ->setTimezone(new DateTimeZone('Europe/Zurich'))
    ->format('Y-m-d H:i:s');

if (isset($options['dry-run'])) {
    ksort($values);
    foreach ($values as $uvOrt => $level) {
        echo "$uvOrt=$level" . PHP_EOL;
    }
    echo 'Would import ' . count($values) . " UV index values for $timestamp" . PHP_EOL;
    exit(0);
}

$connection = connectToDatabase();
[$updated, $skipped] = updateDatabase($connection, $values, $timestamp);
pg_close($connection);

echo "Imported $updated UV index values for $timestamp; skipped $skipped." . PHP_EOL;
