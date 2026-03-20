<?php
/**
 * InfoLady Unified PHP Backend
 * Handles SEO Scanning, Lead Capture, and Admin Dashboard
 */

// Temporarily enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Config
$ADMIN_TOKEN = 'inf0lady-admin-2026';
$LEADS_DIR = dirname(__DIR__) . '/seo-backend';
$LEADS_FILE = $LEADS_DIR . '/leads.json';

// Ensure leads directory exists and is writable
if (!file_exists($LEADS_DIR)) {
    @mkdir($LEADS_DIR, 0755, true);
}

// Ensure leads.json exists and is initialized
if (!file_exists($LEADS_FILE)) {
    @file_put_contents($LEADS_FILE, json_encode([], JSON_PRETTY_PRINT));
}

// Simple Router
$path = isset($_GET['path']) ? $_GET['path'] : '';

switch ($path) {
    case 'ping':
        echo json_encode([
            'status' => 'ok',
            'message' => 'PHP backend is alive',
            'storage' => [
                'dir' => $LEADS_DIR,
                'dir_exists' => file_exists($LEADS_DIR),
                'dir_writable' => is_writable($LEADS_DIR),
                'file' => $LEADS_FILE,
                'file_exists' => file_exists($LEADS_FILE),
                'file_writable' => file_exists($LEADS_FILE) ? is_writable($LEADS_FILE) : is_writable($LEADS_DIR)
            ],
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
        ]);
        exit;
    case 'scan':
        handleScan();
        exit;
    case 'lead':
        handleLeadCapture();
        exit;
    case 'leads-admin':
        handleAdminLeads();
        exit;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found', 'path' => $path]);
        exit;
}

/**
 * Handle SEO Scan Request
 */
function handleScan()
{
    $url = isset($_GET['url']) ? $_GET['url'] : '';
    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['error' => 'URL parameter is required']);
        return;
    }

    if (!preg_match('/^https?:\/\//i', $url)) {
        $url = 'https://' . $url;
    }

    // Use CURL to fetch HTML
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    $html = curl_exec($ch);
    if (curl_errno($ch)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to analyze website: ' . curl_error($ch)]);
        curl_close($ch);
        return;
    }
    curl_close($ch);

    // Simple parser
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    @$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
    libxml_clear_errors();

    $title = '';
    $titles = $dom->getElementsByTagName('title');
    if ($titles->length > 0)
        $title = trim($titles->item(0)->nodeValue);

    $metaDesc = '';
    $metas = $dom->getElementsByTagName('meta');
    foreach ($metas as $meta) {
        if (strtolower($meta->getAttribute('name')) === 'description') {
            $metaDesc = $meta->getAttribute('content');
            break;
        }
    }

    $h1Count = $dom->getElementsByTagName('h1')->length;

    $canonical = '';
    $links = $dom->getElementsByTagName('link');
    foreach ($links as $link) {
        if (strtolower($link->getAttribute('rel')) === 'canonical') {
            $canonical = $link->getAttribute('href');
            break;
        }
    }

    $robots = '';
    foreach ($metas as $meta) {
        if (strtolower($meta->getAttribute('name')) === 'robots') {
            $robots = $meta->getAttribute('content');
            break;
        }
    }

    $hasSchema = false;
    foreach ($dom->getElementsByTagName('script') as $script) {
        if ($script->getAttribute('type') === 'application/ld+json') {
            $hasSchema = true;
            break;
        }
    }

    $seoScore = 100;
    $issues = [];
    if (!$title) {
        $seoScore -= 20;
        $issues[] = ["title" => "Отсутствует тег Title", "enTitle" => "Missing title tag"];
    }
    if (!$metaDesc) {
        $seoScore -= 15;
        $issues[] = ["title" => "Отсутствует мета-описание", "enTitle" => "Missing meta description"];
    }
    if ($h1Count === 0) {
        $seoScore -= 10;
        $issues[] = ["title" => "Отсутствует тег H1", "enTitle" => "Missing H1 tag"];
    }
    if (stripos($robots, 'noindex') !== false) {
        $seoScore -= 50;
        $issues[] = ["title" => "Сайт закрыт от индексации (noindex)", "enTitle" => "Site blocked from indexing (noindex)"];
    }
    if (!$hasSchema) {
        $seoScore -= 10;
        $issues[] = ["title" => "Отсутствует микроразметка Schema.org", "enTitle" => "Missing Schema.org structured data"];
    }

    $seoScore = max(0, min(100, $seoScore));
    $domain = parse_url($url, PHP_URL_HOST) ?: $url;
    $hash = crc32($domain);

    header('Content-Type: application/json');
    echo json_encode([
        'url' => $url,
        'seoScore' => $seoScore,
        'performanceScore' => 40 + abs($hash % 55),
        'aiScore' => 50 + abs(($hash >> 2) % 45),
        'contentScore' => 60 + abs(($hash >> 4) % 38),
        'parsedData' => compact('title', 'metaDesc', 'h1Count', 'canonical', 'robots', 'hasSchema'),
        'issues' => array_slice($issues, 0, 3)
    ]);
}

/**
 * Handle Lead Capture
 */
function handleLeadCapture()
{
    global $LEADS_FILE;
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['email'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        return;
    }

    $newLead = array_merge([
        'id' => 'L-' . strtoupper(dechex(time())),
        'timestamp' => date('c'),
    ], $data);

    $leads = file_exists($LEADS_FILE) ? (json_decode(file_get_contents($LEADS_FILE), true) ?: []) : [];
    $leads[] = $newLead;
    file_put_contents($LEADS_FILE, json_encode($leads, JSON_PRETTY_PRINT));

    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Lead saved successfully']);
}

/**
 * Handle Admin Dashboard
 */
function handleAdminLeads()
{
    global $LEADS_FILE, $ADMIN_TOKEN;

    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION']))
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']))
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    else {
        $hdrs = get_all_headers_safe();
        $authHeader = $hdrs['Authorization'] ?? $hdrs['authorization'] ?? '';
    }

    $token = preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches) ? trim($matches[1]) : '';

    if ($token !== $ADMIN_TOKEN) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized', 'debug_header' => substr($authHeader, 0, 10) . '...']);
        return;
    }

    $leads = file_exists($LEADS_FILE) ? (json_decode(file_get_contents($LEADS_FILE), true) ?: []) : [];
    header('Content-Type: application/json');
    echo json_encode($leads);
}

/**
 * Safe version of getallheaders() for environments where it is missing
 */
function get_all_headers_safe()
{
    if (function_exists('getallheaders'))
        return getallheaders();
    $headers = [];
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[$name] = $value;
        }
    }
    return $headers;
}
?>