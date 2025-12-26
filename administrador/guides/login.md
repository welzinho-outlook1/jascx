# O que fazer quando a tela de login não aparece (login.md)

**Sintomas comuns:** tela branca, HTML retornado mas sem render, scripts bloqueados no console, erros de CSP/Trusted Types.

1. Verificações rápidas (cliente)
   - Abra DevTools → Console: veja erros de JS, mensagens do CSP ou Trusted Types. Copie mensagens completas.
   - Network → recarregue e verifique se todos os scripts e CSS retornaram 200/304; corrija 404s (caminhos relativos são comuns no admin).

2. Verificações no servidor
   - Verifique logs do Apache/PHP (ex.: `C:\xampp\apache\logs\error.log`). Procure por `PHP` ou `authz_core` e por caminhos incorretos.
   - Faça `php -l` nas páginas principais (`login.php`, `auth.php`) para garantir que não há erros de sintaxe.

3. CSP / Trusted Types
   - Se o console reportar violações de Trusted Types e a página estiver em branco, temporariamente ative `Content-Security-Policy-Report-Only` com a regra `require-trusted-types-for 'script'` antes de aplicá-la em modo `enforce`.
   - Garanta que exista um inicializador de policy (ex.: um script inline com nonce) que crie a policy antes de outros scripts que precisem de `TrustedHTML`.

4. Arquivos estáticos não encontrados
   - Confirme que `xss.js`, `purify.min.js` e `vue` são carregados do caminho correto. No admin o caminho relativo varia (`../assets/...`), corrija se houver 404.

5. Debugging incremental
   - Remova temporariamente modificações recentes (CSP estrito, novos scripts) e reintroduza aos poucos até identificar o causador.

6. Se for um problema de sessão
   - Verifique que `session_start()` é chamado e que cookies de sessão estão sendo criados (`Set-Cookie` no header).
   - Se a sessão foi destruída por expiração/hardening, a página redirecionará; veja querystring `?expired=1`.

7. Contato de emergência
   - Se não conseguir resolver, cole aqui os erros do Console + os primeiros 80 linhas dos logs de erro — isso ajuda a diagnosticar rapidamente.