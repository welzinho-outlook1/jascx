<?php
header('Content-Type: application/json; charset=utf-8');
// Permitir apenas GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}
// Sanitização e validação do parâmetro id
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID inválido']);
    exit;
}
// Caminho seguro para o arquivo de produtos
$produtosPath = realpath(__DIR__ . '/../../data/produtos.json');
if (!$produtosPath || !is_readable($produtosPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Arquivo de produtos não encontrado']);
    exit;
}
$produtos = json_decode(file_get_contents($produtosPath), true);
if (!is_array($produtos)) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao ler produtos']);
    exit;
}
$produto = null;
foreach ($produtos as $p) {
    if (isset($p['id']) && intval($p['id']) === $id) {
        $produto = $p;
        break;
    }
}
if (!$produto) {
    http_response_code(404);
    echo json_encode(['error' => 'Produto não encontrado (rX1:id= ' . $id . ')']);
    exit;
}
// Produtos relacionados: mesma categoria, exceto o próprio
$relacionados = array_filter($produtos, function ($p) use ($produto) {
    if (!isset($p['id']) || $p['id'] === $produto['id']) return false;
    return count(array_intersect($p['categoria'] ?? [], $produto['categoria'] ?? [])) > 0;
});
if (count($relacionados) < 1) {
    $relacionados = array_filter($produtos, function ($p) use ($produto) {
        return isset($p['id']) && $p['id'] !== $produto['id'];
    });
}
$relacionados = array_slice(array_values($relacionados), 0, 3);

// Normalizar imagens: garantir que a resposta sempre tenha um array 'imagens' e uma string 'imagem' de fallback
if (isset($produto['imagens']) && is_array($produto['imagens'])) {
    // filtrar valores não-string e vazios
    $produto['imagens'] = array_values(array_filter($produto['imagens'], function ($u) {
        return is_string($u) && trim($u) !== '';
    }));
} else {
    $produto['imagens'] = [];
    if (isset($produto['imagem']) && is_string($produto['imagem']) && trim($produto['imagem']) !== '') {
        $produto['imagens'][] = $produto['imagem'];
    }
}
// garantir que 'imagem' exista como fallback (compatibilidade com código antigo)
if ((!isset($produto['imagem']) || !is_string($produto['imagem']) || trim($produto['imagem']) === '') && !empty($produto['imagens'])) {
    $produto['imagem'] = $produto['imagens'][0];
}

// Retornar apenas os campos necessários
$response = [
    'produto' => $produto,
    'relacionados' => $relacionados
];
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
