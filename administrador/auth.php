<?php
// auth.php — funções simples de autenticação para a área administrativa
// Bloqueia acesso direto ao arquivo via URL
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    // Redirect to login page instead of exposing a raw 403 page
    header('Location: login.php');
    exit;
}

// Defensive inclusion flag: ensure this file is only executed when explicitly included
if (!defined('ADMIN_INCLUDED')) {
    // Inclusion attempted outside of admin flow — redirect to login
    header('Location: login.php');
    exit;
}

// Harden session cookie params and basic PHP hardening for admin area
// Load hardening settings
if (file_exists(__DIR__ . '/config/php_hardening.php')) {
    require_once __DIR__ . '/config/php_hardening.php';
}
// Load our security helpers (output encoding + extra headers)
if (file_exists(__DIR__ . '/config/security.php')) {
    require_once __DIR__ . '/config/security.php';
    // send common headers early
    if (function_exists('send_common_security_headers')) {
        send_common_security_headers();
    }
}

// Session cookie params (Secure only if HTTPS) — set BEFORE session_start
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
$cookieParams = [
    'lifetime' => 20, // 24 hours
    'path' => '/',
    'domain' => '',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax'
];
// Use array form if available (PHP 7.3+), otherwise fallback
if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params($cookieParams);
} else {
    session_set_cookie_params($cookieParams['lifetime'], $cookieParams['path'], $cookieParams['domain'], $cookieParams['secure'], $cookieParams['httponly']);
}

// Enable strict mode
ini_set('session.use_strict_mode', 1);
// Make sure session data persists for at least the cookie lifetime
ini_set('session.gc_maxlifetime', (string) 86400);

session_start();

// Generate a per-response CSP nonce to allow safe inline scripts (e.g., login page) and send CSP header
try {
    $ADMIN_CSP_NONCE = base64_encode(random_bytes(16));
} catch (Exception $e) {
    // fallback to less-ideal but still random value
    $ADMIN_CSP_NONCE = bin2hex(openssl_random_pseudo_bytes(16));
}
if (!defined('ADMIN_CSP_NONCE')) {
    define('ADMIN_CSP_NONCE', $ADMIN_CSP_NONCE);
}

// Content Security Policy — adjust sources to needs (allow Vue CDN, Google Fonts, and ImageKit domains used by the admin area)
$csp = "default-src 'self'; ";
// Allow Vue CDN and CDNJS/JSDelivr; allow 'unsafe-eval' temporarily because the runtime build may use eval/new Function
// NOTE: we will add Trusted Types and a policy name ('adminPolicy') that will be created client-side to safely allow
$csp .= "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net 'nonce-" . $ADMIN_CSP_NONCE . "' 'unsafe-eval'; ";
// Allow Google Fonts stylesheet; keep 'unsafe-inline' for legacy styles if needed (plan to remove later)
$csp .= "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; ";
// Allow fonts from Google font host + data: for local fonts; keep 'self' as fallback
$csp .= "font-src 'self' https://fonts.gstatic.com data:; ";
$csp .= "img-src 'self' data: https:; ";
$csp .= "connect-src 'self' https://ik.imagekit.io; ";
$csp .= "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; ";
// Use report-only mode for Trusted Types to detect/monitor issues without breaking pages.
// We send the Trusted Types requirement as Report-Only while we verify that all client code
// creates TrustedHTML correctly or uses SafeDOM helpers (prevents page break for old/unsupported browsers).
// Add known library policy names to the report-only trace so their policy creation doesn't trigger false positives
$ttPolicy = "require-trusted-types-for 'script'; trusted-types adminPolicy purify dompurify vue;";
header('Content-Security-Policy-Report-Only: ' . $ttPolicy);
// Also allow CDN for connect-src (source map fetches etc.) to avoid blocked network requests during debugging
// Extend connect-src to include unpkg CDN
$csp = preg_replace('/connect-src\s+([^;]+);/i', "connect-src $1 https://unpkg.com;", $csp);
// Enforce the rest of the CSP (without require-trusted-types-for)
header('Content-Security-Policy: ' . $csp);

// Enforce server-side session expiry (24 hours)
define('ADMIN_SESSION_LIFETIME', 86400); // seconds
if (isset($_SESSION['admin_login_time']) && (time() - $_SESSION['admin_login_time']) > ADMIN_SESSION_LIFETIME) {
    // destroy session and force re-login, but include last login timestamp for informative message
    $last_login_ts = isset($_SESSION['admin_login_time']) ? intval($_SESSION['admin_login_time']) : 0;
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    session_destroy();
    // Leave `admin_last_login` cookie in place — the login page will read it and clear it after showing the notice.
    header('Location: login.php?expired=1&last=' . $last_login_ts);
    exit;
}

function require_admin()
{
    if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
        header('Location: login.php');
        exit;
    }
}

function ensure_logged_in()
{
    return isset($_SESSION['admin_logged']) && $_SESSION['admin_logged'] === true;
}

// --- Login attempt tracking (file-based, simple) ---
function attempts_file()
{
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
        // create .gitignore
        file_put_contents($dir . '/.gitignore', "*\n!.gitignore\n");
    }
    return $dir . '/login_attempts.json';
}

function read_attempts()
{
    $f = attempts_file();
    if (!file_exists($f)) {
        file_put_contents($f, json_encode([]));
        @chmod($f, 0600);
    }

    $fp = fopen($f, 'c+');
    if (!$fp) {
        return [];
    }
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function write_attempts($data)
{
    $f = attempts_file();
    $fp = fopen($f, 'c+');
    if (!$fp) {
        return false;
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    @chmod($f, 0600);
    return true;
}

function add_failed_attempt($ip)
{
    $data = read_attempts();
    if (!isset($data[$ip])) {
        $data[$ip] = ['count' => 0, 'last' => 0];
    }
    $data[$ip]['count']++;
    $data[$ip]['last'] = time();
    write_attempts($data);
    return $data[$ip];
}

function reset_attempts($ip)
{
    $data = read_attempts();
    if (isset($data[$ip])) {
        unset($data[$ip]);
        write_attempts($data);
    }
}

function is_allowed_attempt($ip)
{
    $data = read_attempts();
    $info = isset($data[$ip]) ? $data[$ip] : ['count' => 0, 'last' => 0];
    $count = $info['count'];
    $last = $info['last'];

    // Basic rule: after 5 failed attempts, enforce a 10 second wait from the last attempt
    if ($count >= 5) {
        $elapsed = time() - $last;
        if ($elapsed < 10) {
            return ['allowed' => false, 'wait' => 10 - $elapsed];
        }
    }

    return ['allowed' => true, 'wait' => 0];
}

/**
 * Manage the admin last-login cookie used to show expiry notice.
 */
function set_admin_last_login_cookie($ts)
{
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    if (PHP_VERSION_ID >= 70300) {
        // add a small buffer (+300s) so the cookie remains available for the server to read and show
        // the expiry notice even if the session cookie was invalidated at exactly the same time
        setcookie('admin_last_login', (string)$ts, [
            'expires' => $ts + ADMIN_SESSION_LIFETIME + 300,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    } else {
        setcookie('admin_last_login', (string)$ts, $ts + ADMIN_SESSION_LIFETIME + 300, '/', '', $secure, true);
    }
    $_COOKIE['admin_last_login'] = (string)$ts;
}

function get_admin_last_login_ts()
{
    if (isset($_COOKIE['admin_last_login'])) {
        $v = intval($_COOKIE['admin_last_login']);
        return $v > 0 ? $v : null;
    }
    return null;
}

function clear_admin_last_login_cookie()
{
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    if (PHP_VERSION_ID >= 70300) {
        setcookie('admin_last_login', '', ['expires' => 1, 'path' => '/', 'domain' => '', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
    } else {
        setcookie('admin_last_login', '', 1, '/', '', $secure, true);
    }
    unset($_COOKIE['admin_last_login']);
}

// Try to limit direct download exposure for config/admin.php — attempt to set restrictive perms
if (file_exists(__DIR__ . '/config/admin.php')) {
    @chmod(__DIR__ . '/config/admin.php', 0600);
}
