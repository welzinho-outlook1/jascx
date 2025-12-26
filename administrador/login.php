<?php
require_once __DIR__ . '/config/admin.php';
define('ADMIN_INCLUDED', true);
require_once __DIR__ . '/auth.php';

// Se o usuário já estiver autenticado pelo servidor, não permitir acesso à página de login.
// IMPORTANTE: verificamos somente a flag de sessão (`$_SESSION['admin_logged']`) para evitar
// redirecionamentos baseados apenas em cookies (evita potencial vulnerabilidade).
if (isset($_SESSION['admin_logged']) && $_SESSION['admin_logged'] === true) {
    header('Location: index.php');
    exit;
}

$errors = [];
$expired_info = null;
if (isset($_GET['expired'])) {
    $last = isset($_GET['last']) ? intval($_GET['last']) : null;
    $expired_info = ['last' => $last];
    // clear the persistent last-login cookie (server-side) after reading it for the notice
    if (function_exists('clear_admin_last_login_cookie')) {
        clear_admin_last_login_cookie();
    }
}

// Extra detection: if a session cookie exists but the server-side session does not indicate a logged-in user,
// treat it as an expired/invalid session and show the expired alert (useful when session files were GC'd).
// Only show the expired alert if we have evidence of a previous login (admin_login_time set or admin_last_login cookie).
if (empty($expired_info) && isset($_COOKIE[session_name()])) {
    // `auth.php` already called session_start(), so $_SESSION is available if present
    if (isset($_SESSION['admin_login_time'])) {
        $last = intval($_SESSION['admin_login_time']);
    } elseif (isset($_COOKIE['admin_last_login'])) {
        $last = intval($_COOKIE['admin_last_login']);
    } else {
        $last = null;
    }

    // Only treat as expired if there was a recorded last login time and we no longer have a logged flag
    if ($last !== null && (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true)) {
        $expired_info = ['last' => $last];
        // clear the persistent last-login cookie (server-side) after reading it for the notice
        if (function_exists('clear_admin_last_login_cookie')) {
            clear_admin_last_login_cookie();
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = $_POST['user'] ?? '';
    $pass = $_POST['pass'] ?? '';

    // Rate limiting per IP (basic)
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $check = is_allowed_attempt($ip);
    if (!$check['allowed']) {
        $errors[] = 'Muitas tentativas. Aguarde ' . intval($check['wait']) . ' segundos antes de tentar novamente.';
    } else {
        if (empty(ADMIN_HASH)) {
            $errors[] = 'Senha administrativa não configurada. Execute <a href="admin_setup.php">admin_setup.php</a> para criar uma senha segura.';
        } else {
            if ($user === ADMIN_USER && password_verify($pass, ADMIN_HASH)) {
                // Successful login: regenerate session id and reset attempts (IP)
                session_regenerate_id(true);
                reset_attempts($ip);

                $_SESSION['admin_logged'] = true;
                $_SESSION['admin_user'] = ADMIN_USER;
                $_SESSION['admin_login_time'] = time(); // timestamp to enforce 24h expiry

                // Generate a CSRF token for sensitive POST actions (logout, etc.)
                if (empty($_SESSION['csrf_token'])) {
                    try {
                        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
                    } catch (Exception $e) {
                        // fallback to less ideal token if random_bytes fails
                        $_SESSION['csrf_token'] = bin2hex(openssl_random_pseudo_bytes(32));
                    }
                }

                // Persist last login timestamp in a secure cookie so we can detect expired sessions
                $cookie_options = [
                    'expires' => time() + 60 * 60 * 24 * 365,
                    'path' => '/',
                    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                    'httponly' => true,
                    'samesite' => 'Lax',
                ];
                if (PHP_VERSION_ID >= 70300) {
                    setcookie('admin_last_login', (string) $_SESSION['admin_login_time'], $cookie_options);
                } else {
                    setcookie('admin_last_login', (string) $_SESSION['admin_login_time'], $cookie_options['expires'], $cookie_options['path'], '', $cookie_options['secure'], $cookie_options['httponly']);
                }

                header('Location: index.php');
                exit;
            } else {
                add_failed_attempt($ip);
                $errors[] = 'Usuário ou senha inválidos.';
            }
        }
    }
}
?>
<!doctype html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <title>Login - Área Administrativa</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="./assets/css/admin-login.css">
    <link rel="icon" type="image/png" href="../assets/images/site-icon/fav.ico">
</head>

<body>
    <script nonce="<?php echo htmlspecialchars(defined('ADMIN_CSP_NONCE') ? ADMIN_CSP_NONCE : '', ENT_QUOTES); ?>">
        // Early Trusted Types policy initializer: create 'adminPolicy' with a safe fallback
        (function() {
            try {
                if (window.trustedTypes && !window.__adminPolicyInitialized) {
                    window.__adminPolicyInitialized = true;
                    trustedTypes.createPolicy('adminPolicy', {
                        createHTML: function(s) {
                            // If DOMPurify is available, use it. Otherwise, fall back to basic escaping
                            if (window.DOMPurify && typeof DOMPurify.sanitize === 'function') {
                                return DOMPurify.sanitize(String(s));
                            }
                            return String(s).replace(/[&<>"']/g, function(c) {
                                return ({
                                    '&': '&amp;',
                                    '<': '&lt;',
                                    '>': '&gt;',
                                    '"': '&quot;',
                                    "'": '&#39;'
                                })[c];
                            });
                        }
                    });
                }
            } catch (e) {
                // If policy creation fails, don't break the page
                console && console.warn && console.warn('Trusted Types policy init failed', e);
            }
        }());
    </script>

    <div id="admin-login-app" class="login-page">
        <div class="footer-logo">
            <h1>JUVELE</h1>
        </div>
        <main class="login-card" role="main">
            <div class="lock-wrapper" aria-hidden="true">
                <!-- cadeado estilizado -->

            </div>
            <img src="../assets/images/dev/seg.png" alt="Ícone Área Administrativa" class="admin-icon" style="width: 64px; margin: auto; display: flex;" />
            <h1 class="brand" style="margin-top: 15px;">Área Administrativa</h1>

            <?php if (!empty($expired_info)): ?>
                <div class="alert-expired" role="alert" aria-live="polite">
                    <div class="alert-icon" aria-hidden="true">⚠️</div>
                    <div class="alert-content">
                        <div class="alert-title">Sessão expirada — é necessário fazer login novamente</div>
                        <div class="alert-body">Por segurança, sua sessão terminou após 24 horas. Por favor, efetue o login novamente para continuar no painel administrativo.</div>
                        <?php if (!empty($expired_info['last'])): ?>
                            <div class="alert-time" data-last-ts="<?php echo (int)$expired_info['last']; ?>">Último login: <span class="js-last-login">—</span><noscript> <?php echo date('d/m/Y H:i:s', (int)$expired_info['last']); ?></noscript></div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif; ?>

            <div v-if="clientErrors.length" class="errors client" role="alert">
                <ul>
                    <li v-for="(e, idx) in clientErrors" :key="idx">{{ e }}</li>
                </ul>
            </div>

            <form @submit.prevent="onSubmit" method="POST" novalidate>
                <div class="field">
                    <label for="user">Usuário</label>
                    <input id="user" name="user" v-model="user" required autocomplete="username" />
                </div>

                <div class="field">
                    <label for="pass">Senha</label>
                    <input :type="showPass ? 'text' : 'password'" id="pass" name="pass" v-model="pass" required autocomplete="current-password" />
                    <label class="show-pass"><input type="checkbox" v-model="showPass"> Mostrar senha</label>
                </div>

                <button class="btn" :disabled="loading" type="submit">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
            </form>

            <!-- Server-side errors (simple inline, small X icon) -->
            <div v-if="serverErrors.length" class="server-error-inline" role="alert" aria-live="assertive">
                <span class="server-error-icon" aria-hidden="true">✖</span>
                <span class="server-error-text" v-html="serverErrors[0]"></span>
            </div>

            <p class="small-note"><a href="../index.html">Voltar</a></p>

            <div class="card-footer" aria-hidden="true">
                <div class="dev-info">
                    <div class="dev-label">Desenvolvido por</div>
                    <div class="dev-name"> <span class="dev-text">Weslley Kholson F. Alves — Kholson.dev@outlook.com</span></div>

                </div>
            </div>
        </main>
    </div>

    <script nonce="<?php echo htmlspecialchars(defined('ADMIN_CSP_NONCE') ? ADMIN_CSP_NONCE : '', ENT_QUOTES); ?>">
        // Use json_for_js helper to safely encode data for JS context
        window.__ADMIN_LOGIN_ERRORS = <?php echo function_exists('json_for_js') ? json_for_js($errors) : json_encode($errors, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_HEX_APOS); ?>;
    </script>
    <!-- DOMPurify (used by our XSS helpers) -->
    <script src="https://unpkg.com/dompurify@2.3.10/dist/purify.min.js"></script>
    <!-- Small XSS helpers (creates Trusted Types policy and safe DOM helpers) -->
    <!-- NOTE: use parent path to point to public assets folder (fixes 404 in admin context) -->
    <script src="../assets/javascript/xss.js" nonce="<?php echo htmlspecialchars(defined('ADMIN_CSP_NONCE') ? ADMIN_CSP_NONCE : '', ENT_QUOTES); ?>"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    <script src="./assets/js/admin-login.js"></script>
</body>

</html>