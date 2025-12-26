# Segurança contra XSS (visão geral)

Este documento descreve as medidas implementadas para reduzir vetores de XSS no projeto e como os desenvolvedores devem tratar dados que serão inseridos no DOM.

Principais medidas implementadas ✅
- CSP reforçada no admin (`require-trusted-types-for 'script'; trusted-types adminPolicy;`) — ver `administrador/auth.php`
- Cabeçalhos adicionais: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` — gerados por `administrador/config/security.php`
- Helper PHP `json_for_js()` para serializar dados destinados ao JS sem risco de quebrar o contexto do `<script>`
- Biblioteca cliente `assets/javascript/xss.js` (usa `DOMPurify`) que cria um wrapper `SafeDOM` com utilitários:
  - `SafeDOM.setHTML(el, html)` — insere HTML sanitizado (usa Trusted Types quando disponível)
  - `SafeDOM.setText(el, text)` — define `textContent`
  - `SafeDOM.escapeHtml(s)` — escape de strings para HTML
  - `SafeDOM.sanitizeUrl(url)` — valida/filtra URLs de atributos (`src`, `href`)

Boas práticas para desenvolvedores 💡
- Nunca faça `el.innerHTML = userProvided` sem sanitizar; prefira `SafeDOM.setHTML(el, html)` ou crie elementos e use `textContent`/`setAttribute`.
- Ao passar dados do PHP para JS em páginas, use `json_for_js()` para serializar dados em segurança para o contexto JS inline.
- Evite `onclick` inline (atributos) — use event listeners e passe IDs via `data-*` quando necessário.
- Remova `unsafe-eval` do CSP quando as dependências (p.ex., builds do Vue) não precisarem mais dele.

Ver também: `assets/javascript/xss.js` (implementação) e `administrador/config/security.php` (helpers do servidor).

---

## Índice de capítulos operacionais 📚
Arquivos de orientação criados em `administrador/guides/`:

- `imagekit.md` — Como trocar chave do ImageKit e testes. 🔑
- `login.md` — Procedimentos se a tela de login ficar em branco / troubleshooting. 🧭
- `img-issues.md` — Possíveis causas de recusa ao baixar imagens por URL (CORS, CSP, etc.). 📛
- `admin-pass.md` — Como trocar a senha do admin com segurança. 🔒
- `updates.md` — Cuidados e checklist ao aplicar updates em produção/staging. ⚙️

> Local: `administrador/guides/` — abra os arquivos para instruções passo a passo.

