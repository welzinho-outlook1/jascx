async function carregarProdutos() {
    try {
        const response = await fetch('./data/produtos.json');
        if (!response.ok) throw new Error('Erro ao carregar produtos');

        let produtos = await response.json();
        // Embaralha os produtos antes de qualquer filtragem/ordenação
        produtos = shuffleArray(produtos);
        // Ordena todos os produtos se o toggle promo estiver ativo
        if (isPromoToggleAtivo()) {
            produtos = ordenarPromocionaisPrimeiro(produtos);
        }
        // Filtra apenas os produtos em destaque
        const produtosDestaque = produtos.filter(p => {
            const destaque = p.Destaque ?? p.destaque;
            return destaque === true || destaque === "true";
        });



        // Chama renderizarProdutos diretamente, sem paginação
        renderizarProdutos(produtosDestaque);
    } catch (erro) {
        console.error('Erro:', erro);
        mostrarErro();
    }
}

// Função utilitária para embaralhar um array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Função para verificar se o produto está em promoção
function isProdutoPromocao(produto) {
    // Considera promoção se tiver desconto, oldprice, ou campo promocao/destaque
    return !!(produto.desconto || produto.oldprice || produto.promocao === true || produto.promocao === "true" || produto.destaque === "promocao");
}

// Modifique o comportamento do toggle promo para ordenar, não ocultar
function ordenarPromocionaisPrimeiro(produtos) {
    return produtos.slice().sort((a, b) => {
        const aPromo = isProdutoPromocao(a) ? 1 : 0;
        const bPromo = isProdutoPromocao(b) ? 1 : 0;
        // Promocionais primeiro, embaralhados entre si
        if (aPromo !== bPromo) return bPromo - aPromo;
        // Se ambos são do mesmo tipo, embaralhe
        return Math.random() < 0.5 ? -1 : 1;
    });
}

// Função para normalizar palavras (remove acentos, minúsculo, trata plural/singular simples)
function normalizarPalavra(palavra) {
    return (palavra || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .replace(/^#/, '') // remove hash inicial
        .replace(/(oes|aes|aos|is|ns|s)$/i, ''); // remove plurais comuns
}

// Função para detectar se a hash ou termo indica "Promoções"
function indicaPromocoes(valor) {
    const normalized = normalizarPalavra(valor)
        .replace(/[^a-z0-9]/g, ''); // remove caracteres não alfanuméricos
    // Aceita variações como "promo", "promocao", "promocoes"
    return ['promo', 'promocao', 'promocoes'].some(k =>
        normalized === k || normalized.startsWith(k)
    );
}

// Função para detectar se a hash atual indica "Promoções"
function hashIndicaPromocoes() {
    return indicaPromocoes(window.location.hash || '');
}

// Variáveis de paginação (apenas para search.html)
let paginaAtual = 1;
const itensPorPagina = 8;
let resultadosBusca = [];
let totalPaginas = 1;
let filtroPrecoSelecionado = "all";

// Atualiza os controles de paginação
function atualizarPaginacao() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const info = document.getElementById('paginationInfo');
    prevBtn.disabled = paginaAtual <= 1;
    nextBtn.disabled = paginaAtual >= totalPaginas;
    info.textContent = `${paginaAtual} de ${totalPaginas}`;
}

// Função para filtrar e ordenar resultados de busca conforme filtro de preço
function filtrarEOrdenarPorPreco(produtos, filtro) {
    // Função auxiliar para obter o preço final após desconto
    function getPrecoFinal(produto) {
        const precoOrigNum = parseFloat(String(produto.preco).replace(',', '.'));
        const descontoPercent = produto.desconto ? parseInt(produto.desconto, 10) : 0;
        if (descontoPercent > 0 && descontoPercent < 100) {
            return Math.round(precoOrigNum * (1 - descontoPercent / 100) * 100) / 100;
        }
        return precoOrigNum;
    }

    let filtrados = produtos.slice();
    switch (filtro) {
        case "0-50":
            filtrados = filtrados.filter(p => getPrecoFinal(p) <= 50);
            break;
        case "50-100":
            filtrados = filtrados.filter(p => getPrecoFinal(p) > 50 && getPrecoFinal(p) <= 100);
            break;
        case "100-200":
            filtrados = filtrados.filter(p => getPrecoFinal(p) > 100 && getPrecoFinal(p) <= 200);
            break;
        case "200+":
            filtrados = filtrados.filter(p => getPrecoFinal(p) > 200);
            break;
        case "price-asc":
            filtrados.sort((a, b) => getPrecoFinal(a) - getPrecoFinal(b));
            break;
        case "price-desc":
            filtrados.sort((a, b) => getPrecoFinal(b) - getPrecoFinal(a));
            break;
        default:
            // "all" não filtra nem ordena
            break;
    }
    // Se for faixa de preço, mantém ordem original; se for asc/desc, já está ordenado
    return filtrados;
}

// Renderiza página específica dos resultados de busca
function renderizarPaginaBusca() {
    // Aplica filtro de preço antes de paginar
    const filtrados = filtrarEOrdenarPorPreco(resultadosBusca, filtroPrecoSelecionado);
    totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const paginaResultados = filtrados.slice(inicio, fim);

    // Garante cache das imagens dos produtos da página de busca
    // ...cache removido...

    renderizarProdutos(paginaResultados, true);
    atualizarPaginacao();
}

// Atualiza o texto de descrição da busca com o termo buscado
function atualizarDescricaoBusca(termo) {
    const desc = document.querySelector('.search-description');
    if (desc) {
        if (termo && termo.trim() !== '') {
            desc.textContent = `Resultados encontrados para "${termo}". Filtre por categoria ou navegue pelas sugestões abaixo.`;
        } else {
            desc.textContent = 'Encontre os produtos perfeitos para você! Filtre os resultados ou navegue pelas sugestões abaixo.';
        }
    }
}

// Modifica buscarProdutosPorTermo para atualizar a descrição da busca
async function buscarProdutosPorTermo(termo) {
    try {
        // Atualiza a descrição da busca
        atualizarDescricaoBusca(termo);

        const response = await fetch('./data/produtos.json');
        if (!response.ok) throw new Error('Erro ao carregar produtos');

        let produtos = await response.json();
        produtos = shuffleArray(produtos);
        if (isPromoToggleAtivo()) {
            produtos = ordenarPromocionaisPrimeiro(produtos);
        }

        // Detecta se é busca por categoria
        const urlParams = new URLSearchParams(window.location.search);
        const isCategoriaBusca = urlParams.get('categoria') === '1';

        let resultados;
        // Se o termo indica promoções, busca produtos em promoção
        if (indicaPromocoes(termo)) {
            resultados = produtos.filter(p => isProdutoPromocao(p));
        } else if (isCategoriaBusca) {
            // Busca por categoria ou por nome quando o clique veio de uma categoria
            const termoNormalizado = normalizarPalavra(termo);
            const palavrasBusca = termo.trim().split(/\s+/).map(normalizarPalavra);
            resultados = produtos.filter(produto => {
                let categorias = [];
                if (typeof produto.categoria === 'string') {
                    categorias = [produto.categoria];
                } else if (Array.isArray(produto.categoria)) {
                    categorias = produto.categoria;
                } else if (Array.isArray(produto.categorias)) {
                    categorias = produto.categorias;
                }
                // Checa correspondência por categoria
                const categoriaMatch = categorias.some(cat =>
                    normalizarPalavra(cat || '').includes(termoNormalizado)
                );
                // Checa correspondência por nome do produto (palavras da busca)
                const nomeProduto = (produto.nome || '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                const nomeMatch = palavrasBusca.every(palavra =>
                    nomeProduto.includes(palavra) || nomeProduto.includes(palavra + 's')
                );
                return categoriaMatch || nomeMatch;
            });
        } else {
            // Busca por nome (comportamento padrão)
            const palavrasBusca = termo.trim().split(/\s+/).map(normalizarPalavra);
            resultados = produtos.filter(produto => {
                const nomeProduto = (produto.nome || '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                return palavrasBusca.every(palavra => {
                    return nomeProduto.includes(palavra) || nomeProduto.includes(palavra + 's');
                });
            });
        }

        resultadosBusca = resultados;
        paginaAtual = 1;
        const filtrados = filtrarEOrdenarPorPreco(resultadosBusca, filtroPrecoSelecionado);
        totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));
        renderizarPaginaBusca();
    } catch (erro) {
        console.error('Erro:', erro);
        mostrarErro();
    }
}

// Função para limitar o número de caracteres do título
function limitarTitulo(titulo, limite = 30) {
    if (typeof titulo !== 'string') return '';
    return titulo.length > limite ? titulo.slice(0, limite - 1) + '…' : titulo;
}

function limitarDescricao(descricao, limite = 100) {
    if (typeof descricao !== 'string') return '';
    return descricao.length > limite ? descricao.slice(0, limite - 1) + '…' : descricao;
}

function renderizarProdutos(produtos, isBusca = false) {
    const container = document.getElementById('produtosContainer');
    const erroDiv = document.getElementById('produtosErro');

    // Garante cache das imagens dos produtos renderizados (útil para chamadas diretas)
    // ...cache removido...

    // Corrige bug visual: sempre limpa estilos do container antes de renderizar
    if (container) {
        container.style.display = '';
        container.style.justifyContent = '';
        container.style.alignItems = '';
        container.style.minHeight = '';
    }

    // Controle do toggle promo: habilita se houver resultados, desabilita se não houver
    setPromoToggleState(produtos && produtos.length > 0);

    if (!produtos || produtos.length === 0) {
        if (isBusca) {
            // mostra mensagem elegante de "sem resultados" apenas para buscas
            mostrarSemResultados();
            return;
        } else {
            mostrarErro();
            return;
        }
    }

    // se houver produtos, garante que a área "sem resultados" e o erro estejam ocultos
    if (erroDiv) erroDiv.hidden = true;

    // garantir que data-price contenha número (se possível) para facilitar filtro/ordenacão
    // Build HTML but sanitize before inserting into the DOM (prevents XSS from product fields)
    const produtosHtml = produtos.map(produto => {
        // Interpretar `produto.preco` como preço original e aplicar `desconto` (%) para calcular preço final.
        const precoOrigNum = parseFloat(String(produto.preco).replace(',', '.'));
        const descontoPercent = produto.desconto ? parseInt(produto.desconto, 10) : 0;
        const precoFinalNum = (descontoPercent > 0 && descontoPercent < 100)
            ? Math.round(precoOrigNum * (1 - descontoPercent / 100) * 100) / 100
            : precoOrigNum;
        const dataPrice = Number.isFinite(precoFinalNum) ? precoFinalNum : '';

        // Detecta se o produto foi publicado há até 7 dias (considerado "novo")
        const publicadoEm = produto['publicado-em'] || produto['publicado_em'] || produto.publicadoEm || null;
        const publicadoDate = publicadoEm ? new Date(publicadoEm + 'T00:00:00') : null;
        const isNovo = publicadoDate ? (Date.now() - publicadoDate.getTime()) >= 0 && (Date.now() - publicadoDate.getTime()) <= 7 * 24 * 60 * 60 * 1000 : false;

        // Use escaped values and let DOMPurify clean the resulting HTML
        const numCores = Array.isArray(produto.cores) ? [...new Set(produto.cores)].length : (produto.cores ? 1 : 0);
        return `
        <article class="produto-card" role="listitem" data-price="${dataPrice}" data-produto-id="${SafeDOM.escapeHtml(produto.id)}" style="cursor:pointer;">
        ${isNovo ? '<span class="novo-badge">Novo</span>' : ''}
        <div class="produto-imagem-wrapper">
            <img src="${SafeDOM.sanitizeUrl(produto.imagem)}" alt="${SafeDOM.escapeHtml(produto.nome)}" class="produto-imagem" loading="lazy" />
            ${(Array.isArray(produto.cores) && produto.cores.length > 0)
                ? (produto.disponibilidade === false
                    ? `<span class='produto-cores-badge esgotado'>Esgotado</span>`
                    : `<span class='produto-cores-badge'>${numCores} cor${numCores > 1 ? 'es' : ''} <span class='circle-color-rainbow' title='Várias cores'></span></span>`
                )
                : ''
            }
        </div>
        <div class="produto-info">
            <h3 class="produto-nome"><strong>${SafeDOM.escapeHtml(limitarTitulo(produto.nome))}</strong></h3>
            <div class="produto-descricao-pequena">${SafeDOM.escapeHtml(limitarDescricao(produto.descricao))}</div>
            <div class="produto-preco-wrapper">
                ${descontoPercent > 0 ? `<div class="produto-preco-original">R$ ${formatarPreco(precoOrigNum)}</div>` : ''}
                <div class="produto-preco-atual">R$ ${formatarPreco(precoFinalNum)}${descontoPercent > 0 ? ` <span class="pdp-discount-badge">- ${descontoPercent}%</span>` : ''}</div>
            </div>
            <a href="pdp.html?id=${SafeDOM.escapeHtml(produto.id)}"> <button class="produto-botao" type="button" data-produto-id="${SafeDOM.escapeHtml(produto.id)}">
               ver detalhes
            </button></a>
        </div>
    </article>
    `;
    }).join('');

    // Insert sanitized HTML (DOMPurify will remove any malicious attributes/handlers)
    SafeDOM.setHTML(container, produtosHtml);

    // Adiciona evento de clique para cada card de produto
    if (container) {
        const cards = container.querySelectorAll('.produto-card');
        cards.forEach(card => {
            card.addEventListener('click', function (e) {
                // Evita conflito se clicar no botão dentro do card
                if (e.target.closest('button')) return;
                const id = card.getAttribute('data-produto-id');
                if (id) {
                    window.location.href = `pdp.html?id=${id}`;
                }
            });
        });

        // Wire buttons for "adicionarAoCarrinho" using event listeners (no inline handlers)
        const buttons = container.querySelectorAll('.produto-botao');
        buttons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const card = btn.closest('[data-produto-id]');
                const pid = card ? card.getAttribute('data-produto-id') : null;
                if (pid) adicionarAoCarrinho(pid);
            });
        });
    }

    erroDiv.hidden = true;
}

function mostrarSemResultados() {
    const container = document.getElementById('produtosContainer');
    const erroDiv = document.getElementById('produtosErro');
    const imgSrc = "./assets/images/avatars/searchnotfound.png";
    if (container) {
        const semHtml = `
            <div class="sem-resultados">
                <p class="sem-resultados-texto">Ops, nenhum resultado foi encontrado para sua pesquisa.</p>
                <img src="${SafeDOM.sanitizeUrl(imgSrc)}" alt="Nenhum resultado encontrado" class="imagem-sem-resultados" />
            </div>
        `;
        SafeDOM.setHTML(container, semHtml);
        // Centraliza o conteúdo do container usando flexbox
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.minHeight = '60vh'; // altura mínima para centralizar melhor
    }
    if (erroDiv) erroDiv.hidden = true; // Esconde mensagem de erro

    // Desabilita o toggle promo
    setPromoToggleState(false);

    // Remove estilos antigos se já existirem
    const oldStyle = document.getElementById('sem-resultados-style');
    if (oldStyle) oldStyle.remove();

    // Adiciona estilos diretamente na página
    const style = document.createElement('style');
    style.id = 'sem-resultados-style';
    style.textContent = `
        .sem-resultados { 
            width: 350px;
            flex-direction: column;
            display: flex;
            padding: 20px;
            justify-content: center;
            text-align: center;
            align-items: center;
            background-color: none;
            border-radius: 8px;
        }
        .sem-resultados-texto {
            width: 100%;
            height: 100%;
            font-size: 20px;
            font-family: Montserrat, sans-serif;
            font-weight: 300;  
            color: #000000ff;
        }
        .imagem-sem-resultados {
            width: 100%;
            height: auto;
            opacity: 0.7;
        }
    `;
    document.head.appendChild(style);

    // --- Cache da imagem de "nenhum resultado" ---
    // Garante que a imagem seja baixada e armazenada no cache
    // ...cache removido...
}

function formatarPreco(preco) {
    return parseFloat(preco).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function mostrarErro() {
    const container = document.getElementById('produtosContainer');
    const erroDiv = document.getElementById('produtosErro');
    if (container) container.innerHTML = '';
    // Removido: lógica para ocultar "noResults"
    if (erroDiv) erroDiv.hidden = false;
}

function adicionarAoCarrinho(produtoId) {
    console.log('Produto adicionado:', produtoId);
    // Implementar lógica do carrinho aqui
}

// Função para saber se o toggle de promoções está ativado
function isPromoToggleAtivo() {
    const promoToggle = document.getElementById('promoToggle');
    return promoToggle && promoToggle.checked;
}

// Função utilitária para controlar o estado do toggle promo
function setPromoToggleState(enabled) {
    const promoToggle = document.getElementById('promoToggle');
    const promoLabel = promoToggle ? promoToggle.closest('label') : null;
    if (promoToggle) {
        promoToggle.disabled = !enabled;
        // Remove inline opacity, usa classe CSS
        if (promoLabel) {
            if (!enabled) {
                promoLabel.classList.add('promo-toggle-disabled');
                promoToggle.checked = false;
            } else {
                promoLabel.classList.remove('promo-toggle-disabled');
            }
        }
    }
}

// Nova função: busca somente produtos em promoção e renderiza como busca (com paginação)
async function buscarProdutosPromocoes() {
    try {
        const response = await fetch('./data/produtos.json');
        if (!response.ok) throw new Error('Erro ao carregar produtos');

        let produtos = await response.json();
        produtos = shuffleArray(produtos);

        // Filtra apenas produtos em promoção
        const promocionais = produtos.filter(p => isProdutoPromocao(p));

        resultadosBusca = promocionais;
        paginaAtual = 1;
        const filtrados = filtrarEOrdenarPorPreco(resultadosBusca, filtroPrecoSelecionado);
        totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));

        renderizarPaginaBusca();
    } catch (erro) {
        console.error('Erro:', erro);
        mostrarErro();
    }
}



// ...log de cache removido...

// Detecta a página e executa a função correta ao carregar
document.addEventListener('DOMContentLoaded', function () {
    const promoToggle = document.getElementById('promoToggle');
    if (promoToggle) {
        promoToggle.addEventListener('change', function () {
            const pathname = window.location.pathname;
            const urlParams = new URLSearchParams(window.location.search);
            const termo = urlParams.get('q') || '';
            // Resetar paginação para a primeira página ao mudar promoções
            if (typeof paginaAtual !== 'undefined') {
                paginaAtual = 1;
            }
            // Resetar filtro de preço ao mudar promoções
            if (typeof filtroPrecoSelecionado !== 'undefined') {
                filtroPrecoSelecionado = 'all';
            }
            // Também resetar o select visualmente, se existir
            const priceFilter = document.getElementById('priceFilter');
            if (priceFilter) {
                priceFilter.value = 'all';
            }
            if (pathname.endsWith('search.html')) {
                // Se a hash indica Promoções, mostrar apenas promocionais
                if (hashIndicaPromocoes()) {
                    buscarProdutosPromocoes();
                } else {
                    buscarProdutosPorTermo(termo);
                }
            } else {
                carregarProdutos();
            }
            // Levar usuário ao topo ao trocar promoções
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    const pathname = window.location.pathname;
    if (pathname.endsWith('search.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const termo = urlParams.get('q') || '';

        // Se a hash atual indica promoções, carregar apenas promocionais
        if (hashIndicaPromocoes()) {
            buscarProdutosPromocoes();
        } else {
            buscarProdutosPorTermo(termo);
        }

        // Reage a mudanças de hash (ex.: clique em categoria que aponta para #Promoções)
        window.addEventListener('hashchange', function () {
            if (hashIndicaPromocoes()) {
                buscarProdutosPromocoes();
            } else {
                // volta ao comportamento padrão: re-executa busca normal (mantém query 'q' se existir)
                const params = new URLSearchParams(window.location.search);
                const termoHash = params.get('q') || '';
                buscarProdutosPorTermo(termoHash);
            }
        });

        // Listeners de paginação
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', function () {
                if (paginaAtual > 1) {
                    paginaAtual--;
                    renderizarPaginaBusca();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
            nextBtn.addEventListener('click', function () {
                if (paginaAtual < totalPaginas) {
                    paginaAtual++;
                    renderizarPaginaBusca();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                // ...sistema de cache removido...
            });
        }
        // Listener do filtro de preço

        // Integração com filtro Vue: escuta evento global
        window.addEventListener('vue-price-filter', function (e) {
            filtroPrecoSelecionado = e.detail.value;
            paginaAtual = 1;
            renderizarPaginaBusca();
        });

        // Suporte legado: select antigo (caso exista)
        const priceFilter = document.getElementById('priceFilter');
        if (priceFilter) {
            priceFilter.addEventListener('change', function () {
                filtroPrecoSelecionado = priceFilter.value;
                paginaAtual = 1;
                renderizarPaginaBusca();
            });
        }

        // --- NOVO: garantir busca ao clicar em "Buscar" ou pressionar Enter ---
        const searchInput = document.getElementById('searchInput');
        const searchSubmit = document.getElementById('searchSubmit');
        if (searchSubmit && searchInput) {
            searchSubmit.addEventListener('click', function () {
                const termo = searchInput.value.trim();
                if (termo) {
                    // Atualiza a URL para refletir a busca (opcional)
                    const params = new URLSearchParams(window.location.search);
                    params.set('q', termo);
                    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                    buscarProdutosPorTermo(termo);
                }
            });
            // Permite buscar ao pressionar Enter no campo de pesquisa
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchSubmit.click();
                }
            });
        }

        // --- ALTERAÇÃO: obter termo da barra de pesquisa, se existir ---
        let termoBusca = '';
        if (searchInput && searchInput.value.trim() !== '') {
            termoBusca = searchInput.value.trim();
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            termoBusca = urlParams.get('q') || '';
        }

        // Se a hash atual indica promoções, carregar apenas promocionais
        if (hashIndicaPromocoes()) {
            buscarProdutosPromocoes();
        } else {
            buscarProdutosPorTermo(termoBusca);
        }
    } else {
        carregarProdutos();
    }
});