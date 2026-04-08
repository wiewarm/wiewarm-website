<?php

require_once(__DIR__ . '/api/shared.php');

class SitemapFallbackLogger {
    public function debug($message) {}
    public function err($message) {
        error_log($message);
    }
}

global $logger;
if (class_exists('\Log')) {
    $logger = \Log::factory('error_log', PEAR_LOG_TYPE_SYSTEM, 'sitemap.php');
} else {
    $logger = new SitemapFallbackLogger();
}

function sitemapXmlEscape($value) {
    return htmlspecialchars((string) $value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
}

function sitemapBaseUrl() {
    $host = $_SERVER['HTTP_X_FORWARDED_HOST']
        ?? $_SERVER['HTTP_HOST']
        ?? $_SERVER['SERVER_NAME']
        ?? 'localhost';
    $host = preg_replace('/:\d+$/', '', $host);
    $forwardedProto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
    $https = $_SERVER['HTTPS'] ?? '';

    if ($forwardedProto === 'https' || $https === 'on' || $https === '1') {
        $scheme = 'https';
    } elseif ($host !== 'localhost' && preg_match('/wiewarm\.ch$/', $host)) {
        $scheme = 'https';
    } else {
        $scheme = 'http';
    }

    return $scheme . '://' . $host;
}

function sitemapFormatLastmod($timestamp) {
    if (!$timestamp) {
        return null;
    }

    $date = date_create($timestamp);
    if (!$date) {
        return null;
    }

    return $date->format('c');
}

function sitemapFetchUrls() {
    global $logger;

    $con = pconnect();
    $sql = "
        SELECT
            btid.textual_id AS badid_text,
            MAX(bk.newest_datum) AS lastmod
        FROM bad b
        JOIN bad_textual_id btid ON btid.id = b.id
        LEFT JOIN becken bk ON bk.badid = b.id
        GROUP BY b.id, btid.textual_id
        ORDER BY btid.textual_id";

    $logger->debug("sitemap query: $sql");
    $sth = query($con, $sql);

    $badUrls = array();
    $latestBadUpdate = null;

    while ($row = fetch_assoc($sth)) {
        $row = array_change_key_case($row, CASE_LOWER);
        $badUrls[] = $row;

        if (!empty($row['lastmod']) && ($latestBadUpdate === null || $row['lastmod'] > $latestBadUpdate)) {
            $latestBadUpdate = $row['lastmod'];
        }
    }

    return array($badUrls, $latestBadUpdate);
}

function sitemapBuildXml($baseUrl, $badUrls, $latestBadUpdate) {
    $urls = array();
    $urls[] = array('loc' => $baseUrl . '/', 'lastmod' => $latestBadUpdate);
    $urls[] = array('loc' => $baseUrl . '/info', 'lastmod' => null);

    foreach ($badUrls as $row) {
        $urls[] = array(
            'loc' => $baseUrl . '/bad/' . rawurlencode($row['badid_text']),
            'lastmod' => $row['lastmod'] ?: null,
        );
    }

    $xml = array();
    $xml[] = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml[] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    foreach ($urls as $url) {
        $xml[] = '  <url>';
        $xml[] = '    <loc>' . sitemapXmlEscape($url['loc']) . '</loc>';
        if ($url['lastmod']) {
            $xml[] = '    <lastmod>' . sitemapXmlEscape(sitemapFormatLastmod($url['lastmod'])) . '</lastmod>';
        }
        $xml[] = '  </url>';
    }

    $xml[] = '</urlset>';

    return implode("\n", $xml) . "\n";
}

try {
    list($badUrls, $latestBadUpdate) = sitemapFetchUrls();

    header('Content-Type: application/xml; charset=UTF-8');
    echo sitemapBuildXml(sitemapBaseUrl(), $badUrls, $latestBadUpdate);
} catch (Exception $e) {
    $logger->err("sitemap generation failed: " . $e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=UTF-8');
    }
    echo "sitemap generation failed\n";
}
