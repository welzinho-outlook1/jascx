<?php

require_once __DIR__ . '/../vendor/autoload.php';

use ImageKit\ImageKit;

// Carrega as chaves a partir de variáveis de ambiente. Configure as variáveis
// IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY e IMAGEKIT_URL no seu servidor.
$publicKey = getenv('IMAGEKIT_PUBLIC_KEY') ?: (isset($_ENV['IMAGEKIT_PUBLIC_KEY']) ? $_ENV['IMAGEKIT_PUBLIC_KEY'] : null);
$privateKey = getenv('IMAGEKIT_PRIVATE_KEY') ?: (isset($_ENV['IMAGEKIT_PRIVATE_KEY']) ? $_ENV['IMAGEKIT_PRIVATE_KEY'] : null);
$urlEndpoint = getenv('IMAGEKIT_URL') ?: (isset($_ENV['IMAGEKIT_URL']) ? $_ENV['IMAGEKIT_URL'] : null);

// Não exponha chaves em mensagens de erro — registre e devolva uma mensagem genérica
if (!$publicKey || !$privateKey || !$urlEndpoint) {
    error_log('ImageKit credentials not configured - set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL');
    http_response_code(500);
    die('ImageKit não configurado. Entre em contato com o administrador.');
}

$imageKit = new ImageKit($publicKey, $privateKey, $urlEndpoint);
