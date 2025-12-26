window.initPdpZoom = function () {
    const zoomBtn = document.querySelector('.pdp-zoom');
    const mainImg = document.getElementById('pdpMainImage');
    if (!zoomBtn || !mainImg) return;

    // Remover event listeners antigos (caso re-renderize)
    zoomBtn.onclick = null;
    mainImg.onclick = null;

    zoomBtn.addEventListener('click', openZoom);
    mainImg.addEventListener('click', openZoom);

    function openZoom() {
        const src = mainImg.getAttribute('data-large') || mainImg.src;
        const overlay = document.createElement('div');
        overlay.className = 'pdp-zoom-overlay';
        overlay.tabIndex = 0;
        const tpl = `
            <div class="pdp-zoom-inner">
                <img src="${SafeDOM.sanitizeUrl(src)}" class="pdp-zoom-img" alt="zoom">
                <button class="pdp-zoom-close" aria-label="Fechar">&times;</button>
            </div>`;
        SafeDOM.setHTML(overlay, tpl);
        document.body.appendChild(overlay);

        const zimg = overlay.querySelector('.pdp-zoom-img');
        const closeBtn = overlay.querySelector('.pdp-zoom-close');
        let scale = 1;
        const MIN = 1, MAX = 4;

        // Ajuste para garantir que a imagem seja exibida por completo no overlay
        const zoomInner = overlay.querySelector('.pdp-zoom-inner');
        zoomInner.style.display = 'flex';
        zoomInner.style.alignItems = 'center';
        zoomInner.style.justifyContent = 'center';
        zoomInner.style.height = '90vh';
        zoomInner.style.width = '90vw';
        zoomInner.style.boxSizing = 'border-box';
        zoomInner.style.overflow = 'hidden'; // impede que a imagem ultrapasse o container

        zimg.style.maxWidth = '100%';
        zimg.style.maxHeight = '100%';
        zimg.style.width = 'auto';
        zimg.style.height = 'auto';
        zimg.style.display = 'block';
        zimg.style.margin = '0 auto';
        zimg.style.transform = 'scale(1)';
        zimg.style.transformOrigin = '50% 50%';

        function setScale(s) {
            scale = Math.max(MIN, Math.min(MAX, s));
            zimg.style.transform = `scale(${scale})`;
            if (scale > 1) zimg.classList.add('zoomed'); else zimg.classList.remove('zoomed');
        }

        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        function updateOrigin(clientX, clientY) {
            const rect = zimg.getBoundingClientRect();
            const overlayRect = overlay.querySelector('.pdp-zoom-inner').getBoundingClientRect();
            // Calcula a posição relativa do mouse dentro do container
            let x = ((clientX - rect.left) / rect.width) * 100;
            let y = ((clientY - rect.top) / rect.height) * 100;

            // Limitar o transform-origin para não mostrar fora do container
            if (scale > 1) {
                // Tamanho da imagem ampliada
                const scaledWidth = rect.width * scale;
                const scaledHeight = rect.height * scale;
                const containerWidth = overlayRect.width;
                const containerHeight = overlayRect.height;

                // Limites máximos/minimos para o transform-origin
                const maxX = 100 - ((containerWidth / scaledWidth) * 100) / 2;
                const minX = ((containerWidth / scaledWidth) * 100) / 2;
                const maxY = 100 - ((containerHeight / scaledHeight) * 100) / 2;
                const minY = ((containerHeight / scaledHeight) * 100) / 2;

                x = clamp(x, minX, maxX);
                y = clamp(y, minY, maxY);
            }

            zimg.style.transformOrigin = `${x}% ${y}%`;
        }

        overlay.addEventListener('wheel', function (e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(scale + delta);
            updateOrigin(e.clientX, e.clientY);
        }, { passive: false });

        overlay.addEventListener('mousemove', function (e) {
            if (scale <= 1) return;
            updateOrigin(e.clientX, e.clientY);
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay || e.target === closeBtn) {
                overlay.remove();
            }
        });

        closeBtn.addEventListener('click', function () { overlay.remove(); });
        overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.remove(); });
    }
};
