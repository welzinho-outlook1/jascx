<?php
// Logout protegido: exige POST + token CSRF
// Definimos a flag e incluímos `auth.php` para ter tratamento consistente de sessão
define('ADMIN_INCLUDED', true);
require_once __DIR__ . '/auth.php';

// Apenas aceita POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: login.php');
    exit;
}

// Valida token CSRF
$token = $_POST['csrf'] ?? '';
if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], (string)$token)) {
    header('Location: login.php');
    exit;
}

// Destrói sessão e redireciona para login
$_SESSION = [];
// clear session variables
session_unset();
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    // Remove cookie using options array when available (PHP 7.3+), preserving samesite
    if (PHP_VERSION_ID >= 70300) {
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?? '/',
            'domain' => $params['domain'] ?? '',
            'secure' => $params['secure'] ?? false,
            'httponly' => $params['httponly'] ?? true,
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);

        // Also remove persistent last-login cookie
        setcookie('admin_last_login', '', [
            'expires' => time() - 42000,
            'path' => '/',
            'domain' => '',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );

        // Also remove persistent last-login cookie (older PHP)
        setcookie('admin_last_login', '', time() - 42000, '/', '', (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'), true);
    }
}
session_destroy();
header('Location: login.php');
exit;
