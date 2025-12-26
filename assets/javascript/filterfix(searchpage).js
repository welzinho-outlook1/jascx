document.addEventListener('DOMContentLoaded', function () {
    if (!window.location.pathname.endsWith('search.html')) return;

    const priceFilterWrapper = document.querySelector('.price-filter-wrapper');
    const promoToggleWrapper = document.querySelector('.promo-toggle-wrapper');

    // Cria spacer para evitar sobreposição do conteúdo
    let stickySpacer = document.querySelector('.sticky-filter-spacer');
    if (!stickySpacer && priceFilterWrapper) {
        stickySpacer = document.createElement('div');
        stickySpacer.className = 'sticky-filter-spacer';
        priceFilterWrapper.parentNode.insertBefore(stickySpacer, priceFilterWrapper.nextSibling);
    }

    // Calcula o limite inferior para desafixar (quando filtros voltam à posição original)
    function getUnstickLimit() {
        // Obtém todos os cards de produto visíveis
        const produtos = document.querySelectorAll('.produto-card');
        if (!produtos.length) return Infinity;
        // Pega o último produto visível
        const ultimoProduto = produtos[produtos.length - 1];
        // Calcula a posição Y do final do último produto em relação ao topo do documento
        const rect = ultimoProduto.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        return rect.bottom + scrollY;
    }

    // Estado para histerese
    let filtersAreUnstuck = false;
    function updateStickyFilters() {
        // NOVO: desfixa filtros se barra de busca estiver aberta
        const searchBar = document.getElementById('siteSearch');
        if (searchBar && searchBar.classList.contains('open')) {
            if (priceFilterWrapper) {
                priceFilterWrapper.classList.remove('sticky-filter');
                if (stickySpacer) stickySpacer.classList.remove('active');
            }
            if (promoToggleWrapper) {
                promoToggleWrapper.classList.remove('sticky-filter');
            }
            filtersAreUnstuck = false;
            return;
        }

        const scrollY = window.scrollY || window.pageYOffset;
        const stickyStart = (priceFilterWrapper ? priceFilterWrapper.offsetTop : 0) - 30;
        const unstickLimit = getUnstickLimit();

        // Desafixa antes do topo (por exemplo, 40px antes do topo original)
        const earlyUnstick = (priceFilterWrapper ? priceFilterWrapper.offsetTop : 0) + 100;
        const shouldStick = scrollY > stickyStart && scrollY < unstickLimit && scrollY > earlyUnstick;

        // Histerese: dois limites dinâmicos baseados no último produto
        const unstickThreshold = unstickLimit - 100; // y do(s) último(s) produto(s)
        const restickThreshold = unstickThreshold - 50;

        if (!filtersAreUnstuck && scrollY > unstickThreshold) {
            filtersAreUnstuck = true;
        } else if (filtersAreUnstuck && scrollY < restickThreshold) {
            filtersAreUnstuck = false;
        }

        const shouldUnstickByScroll = filtersAreUnstuck;

        if (priceFilterWrapper) {
            if (shouldStick && !shouldUnstickByScroll) {
                priceFilterWrapper.classList.add('sticky-filter');
                if (stickySpacer) stickySpacer.classList.add('active');
            } else {
                priceFilterWrapper.classList.remove('sticky-filter');
                if (stickySpacer) stickySpacer.classList.remove('active');
            }
        }
        if (promoToggleWrapper) {
            if (shouldStick && !shouldUnstickByScroll) {
                promoToggleWrapper.classList.add('sticky-filter');
            } else {
                promoToggleWrapper.classList.remove('sticky-filter');
            }
        }
    }

    window.addEventListener('scroll', updateStickyFilters, { passive: true });
    window.addEventListener('resize', updateStickyFilters);
    // NOVO: escuta evento para atualizar sticky filters sempre que solicitado
    document.addEventListener('sticky-filters-update', updateStickyFilters);
    updateStickyFilters();
});
