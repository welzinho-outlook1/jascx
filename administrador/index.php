<?php
define('ADMIN_INCLUDED', true);
require_once __DIR__ . '/auth.php';
require_admin();
?>
<!doctype html>
<html lang="pt-BR">

<head>
    <meta charset="utf-8">
    <title>Painel Administrativo</title>
</head>

<body>
    <h1>Painel Administrativo</h1>
    <?php if (empty($_SESSION['csrf_token'])) {
        try {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        } catch (Exception $e) {
            $_SESSION['csrf_token'] = bin2hex(openssl_random_pseudo_bytes(32));
        }
    } ?>
    <p>Bem-vindo, <?php echo htmlspecialchars($_SESSION['admin_user'] ?? ''); ?> —
    <form action="logout.php" method="POST" style="display:inline; margin:0; padding:0;">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
        <button type="submit" style="background:none;border:none;padding:0;margin:0;color:#06c;text-decoration:underline;cursor:pointer;">Sair</button>
    </form>
    </p>

    <form action="./handlers/upload-imagem.php" method="POST" enctype="multipart/form-data">
        <input type="file" name="imagem" required>
        <button type="submit">Enviar imagem</button>
    </form>

</body>

</html>