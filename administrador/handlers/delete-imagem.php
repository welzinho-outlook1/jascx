<?php

define('ADMIN_INCLUDED', true);
require_once __DIR__ . '/../auth.php';
require_admin();
require_once __DIR__ . '/../config/imagekit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../login.php');
    exit;
}

if (empty($_POST['fileId'])) {
    die('Parâmetro fileId não fornecido.');
}

$fileId = $_POST['fileId'];

// Tentativa de deletar
$response = $imageKit->deleteFile($fileId);

if (isset($response->error) && $response->error) {
    if (is_string($response->error)) {
        echo "Erro: " . htmlspecialchars($response->error, ENT_QUOTES, 'UTF-8');
    } elseif (isset($response->error->message)) {
        echo "Erro: " . htmlspecialchars($response->error->message, ENT_QUOTES, 'UTF-8');
    } else {
        echo "Erro ao apagar: " . htmlspecialchars(json_encode($response->error), ENT_QUOTES, 'UTF-8');
    }
    exit;
}

echo "Imagem removida com sucesso.<br>";
// Mostra a resposta da API para depuração
echo "<pre>" . htmlspecialchars(print_r($response, true)) . "</pre>";

// Link de volta
echo "<a href=\"../index.php\">Voltar</a>";
