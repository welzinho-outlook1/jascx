# Possíveis causas da recusa de baixar imagens por URL (img-issues.md)

1. Origem bloqueada (CORS / Refused / 403)
   - Servidores remotos podem bloquear fetches diretos (CORS) ou retornarem 403 para requests não autorizadas.
   - Solução: usar um servidor proxy autorizado (com cache), ou reconfigurar o host remoto para permitir o origin.

2. URL inválida ou esquema perigoso
   - Verifique se o `src` passado não contém `javascript:` ou `data:` (com scripts embutidos).
   - Use `SafeDOM.sanitizeUrl()` para validar antes de atribuir a `src`.

3. Políticas CSP / connect-src
   - Se o frontend estiver usando CSP restrito, requests para baixar arquivos podem ser bloqueados pelo `connect-src`.
   - Verifique headers de CSP no admin e permita domínios confiáveis (ex.: `ik.imagekit.io`, CDNs) se necessário.

4. TLS/HTTPS mismatch
   - Downloads de `https` podem falhar se o servidor local estiver com problemas de certificado. Em produção, garanta certificados válidos.

5. Rate limiting / firewall do host remoto
   - Alguns serviços limitam downloads por IP. Confira logs do servidor remoto ou use rate-limiting do lado do cliente.

6. Respostas grandes / tempo limite
   - Servidores que retornam conteúdo muito grande ou lento podem provocar timeout. Ajuste `fetch`/cURL timeout e implemente retries exponenciais.

7. Arquivo não encontrado (404)
   - Sempre verifique o `status` HTTP e trate erros para não inserir URLs inválidas no DOM.

8. Testes e correções
   - Teste a URL via `curl -I <url>` e via navegador.
   - Logue respostas completas nos handlers (com cuidado para não vazar credenciais) e sanitize a saída para debugging.
