<?php
// php_hardening.php — basic PHP runtime hardening for admin area
// Disable display of errors in production and log errors to admin area
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('error_reporting', E_ALL);

// Error log file inside admin config (not accessible by web due to .htaccess)
$errorLog = __DIR__ . '/php_errors.log';
if (!file_exists($errorLog)) {
    @file_put_contents($errorLog, "");
    @chmod($errorLog, 0600);
}
ini_set('error_log', $errorLog);

// Optionally, enforce other ini settings
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['SERVER_PORT'] == 443) ? 1 : 0);

// Ensure a sensible default timezone for the admin area (so date() outputs local time).
// Only set it if PHP's date.timezone is not configured.
if (ini_get('date.timezone') === '') {
    date_default_timezone_set('America/Sao_Paulo');
}
