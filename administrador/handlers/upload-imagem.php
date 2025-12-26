<?php

define('ADMIN_INCLUDED', true);
require_once __DIR__ . '/../auth.php';
require_admin();
require_once __DIR__ . '/../config/imagekit.php';

if (!isset($_FILES['imagem'])) {
    die("Nenhuma imagem enviada.");
}

$arquivo = $_FILES['imagem'];

// Validação básica
$tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

if (!in_array($arquivo['type'], $tiposPermitidos)) {
    die("Tipo de arquivo não permitido.");
}

// Upload para o ImageKit
$response = $imageKit->upload([
    'file' => fopen($arquivo['tmp_name'], 'r'),
    'fileName' => uniqid() . '-' . $arquivo['name'],
    'folder' => '/produtos'
]);

if (isset($response->error) && $response->error) {
    // Error can be a string or an object
    if (is_string($response->error)) {
        echo "Erro: " . $response->error;
    } elseif (isset($response->error->message)) {
        echo "Erro: " . $response->error->message;
    } else {
        echo "Erro no upload: " . json_encode($response->error);
    }
    exit;
}

// Try to get the final URL from the response (SDK stores result in ->result)
$result = isset($response->result) ? $response->result : null;
$url = null;
if ($result) {
    // Common fields returned by ImageKit upload API
    if (isset($result->url)) {
        $url = $result->url;
    } elseif (isset($result->filePath)) {
        $url = $result->filePath;
    } elseif (isset($result->uploadUrl)) {
        $url = $result->uploadUrl;
    }
}

if (!$url) {
    // If no URL found, dump the response for debugging
    echo "Upload feito com sucesso, mas não foi possível recuperar a URL.<br>";
    echo "Resposta completa: <pre>" . htmlspecialchars(print_r($response, true)) . "</pre>";
    exit;
}

// Mostrar metadados da resposta para ajudar no debug
if (isset($response->responseMetadata)) {
    echo "<strong>Metadados da resposta:</strong><br>";
    echo "<pre>" . htmlspecialchars(print_r($response->responseMetadata, true)) . "</pre>";
}

// URL final da imagem
echo "Upload feito com sucesso!<br>";
$escapedUrl = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
echo "URL: <a href='" . $escapedUrl . "' target='_blank' rel='noopener noreferrer'>" . $escapedUrl . "</a><br>";

// Tentar checar se a URL é acessível a partir do servidor
$headers = @get_headers($url);
if ($headers !== false) {
    echo "Cabeçalhos do recurso remoto:<br><pre>" . htmlspecialchars(print_r($headers, true)) . "</pre>";
    if (preg_match('#HTTP/\d\.\d\s+(\d{3})#', $headers[0], $m)) {
        $status = (int)$m[1];
        if ($status >= 200 && $status < 300) {
            echo "<img src='" . $escapedUrl . "' width='300' alt='Imagem enviada' onerror=\"this.style.display='none';document.getElementById('img-error').style.display='block';\">";
            echo "<div id='img-error' style='display:none;color:#a00;'>Erro ao carregar a imagem no navegador — verifique a URL/permissões.</div>";
        } else {
            // Se for 401, tentar gerar uma URL assinada (caso a conta exija URLs assinadas ou o arquivo seja privado)
            if ($status === 401 && isset($result->filePath)) {
                echo "URL requer autenticação (HTTP 401). Tentando gerar URL assinada temporária...<br>";
                // Gera URL assinada expirada em 5 minutos
                $signedUrl = $imageKit->url([
                    'path' => $result->filePath,
                    'signed' => true,
                    'expireSeconds' => 300
                ]);
                $escapedSigned = htmlspecialchars($signedUrl, ENT_QUOTES, 'UTF-8');
                echo "URL assinada: <a href='" . $escapedSigned . "' target='_blank' rel='noopener noreferrer'>" . $escapedSigned . "</a><br>";
                echo "<img src='" . $escapedSigned . "' width='300' alt='Imagem enviada'>";
            } else {
                echo "URL acessível, mas retornou status HTTP {$status}. Talvez o arquivo esteja privado ou inacessível.<br>";
                echo "<img src='" . $escapedUrl . "' width='300' alt='Imagem enviada'>";
            }
        }
    } else {
        echo "Não foi possível determinar o status HTTP.<br>";
        echo "<img src='" . $escapedUrl . "' width='300' alt='Imagem enviada'>";
    }
} else {
    echo "Não foi possível acessar a URL a partir do servidor (get_headers falhou). A URL pode ser inválida ou exigir autenticação.<br>";
    echo "<img src='" . $escapedUrl . "' width='300' alt='Imagem enviada'>";
}

// Mostrar botão de apagar se tivermos o fileId retornado pelo ImageKit
if (isset($result->fileId)) {
    $escapedFileId = htmlspecialchars($result->fileId, ENT_QUOTES, 'UTF-8');
    echo "<form method='POST' action='delete-imagem.php' onsubmit=\"return confirm('Apagar esta imagem?');\" style='margin-top:10px;'>";
    echo "<input type='hidden' name='fileId' value='" . $escapedFileId . "'>";
    echo "<button type='submit' style='padding:6px 12px;background:#d9534f;border:0;color:#fff;border-radius:4px;cursor:pointer;'>Apagar imagem</button>";
    echo "</form>";
} else {
    // Se não houver fileId, informar que não é possível apagar programaticamente
    echo "<div style='margin-top:8px;color:#a00;'>Não foi possível obter o ID do arquivo (fileId). Remoção via API não será possível.</div>";
}
