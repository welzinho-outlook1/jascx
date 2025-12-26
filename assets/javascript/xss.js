// XSS helpers: DOMPurify + Trusted Types wrapper
// Loads after DOMPurify is available (we rely on DOMPurify global `DOMPurify`)
(function (window) {
    'use strict';

    const DEFAULT_POLICY_NAME = 'adminPolicy';
    let policy = null;

    function initPolicy() {
        if (window.trustedTypes && !policy) {
            try {
                policy = trustedTypes.createPolicy(DEFAULT_POLICY_NAME, {
                    createHTML: (s) => {
                        // DOMPurify sanitizes HTML and returns a safe string; policy then wraps it as TrustedHTML
                        return DOMPurify.sanitize(s, { ALLOWED_TAGS: null });
                    }
                });
            } catch (e) {
                // creating policy may fail in some browsers/configs — fall back to null
                policy = null;
            }
        }
    }

    function escapeHtml(s) {
        return (s === null || s === undefined) ? '' : String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    function sanitizeHtml(html) {
        if (typeof DOMPurify === 'undefined') {
            // If DOMPurify is not loaded, fall back to escaping
            return escapeHtml(html);
        }
        // Default DOMPurify config is secure for user-provided content
        return DOMPurify.sanitize(String(html));
    }

    function sanitizeUrl(url) {
        // Basic scheme whitelisting
        try {
            const u = String(url).trim();
            if (u === '') return '';
            // disallow javascript: and data: with scripts
            if (/^(javascript|data):/i.test(u)) return '';
            return u;
        } catch (e) {
            return '';
        }
    }

    function setHTML(el, html) {
        if (!el) return;
        const safe = sanitizeHtml(html);
        initPolicy();
        if (policy) {
            try {
                el.innerHTML = policy.createHTML(safe);
                return;
            } catch (e) {
                // fall back
            }
        }
        el.innerHTML = safe;
    }

    function setText(el, text) {
        if (!el) return;
        el.textContent = text == null ? '' : String(text);
    }

    function safeAttribute(el, attrName, value) {
        if (!el) return;
        if (attrName === 'href' || attrName === 'src') {
            const v = sanitizeUrl(value);
            if (v === '') {
                el.removeAttribute(attrName);
                return;
            }
            el.setAttribute(attrName, v);
            return;
        }
        el.setAttribute(attrName, String(value));
    }

    // Expose utilities
    window.SafeDOM = {
        escapeHtml,
        sanitizeHtml,
        sanitizeUrl,
        setHTML,
        setText,
        safeAttribute,
        _initPolicy: initPolicy
    };

    // Auto-init policy on load
    if (typeof DOMPurify !== 'undefined') {
        initPolicy();
    } else {
        // If DOMPurify loads later, try to init when DOMPurify becomes available
        const observer = setInterval(() => {
            if (typeof DOMPurify !== 'undefined') {
                clearInterval(observer);
                initPolicy();
            }
        }, 200);
    }

}(window));