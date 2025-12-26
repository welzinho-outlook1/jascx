# Considerações ao aplicar atualizações (updates.md)

**Resumo:** checklist de riscos e cuidados ao atualizar código, dependências e config em produção.

1. Antes de atualizar
   - Faça backup completo (código + banco + arquivos de upload).
   - Teste a atualização em um ambiente de staging que reflita a produção (mesmas versões de PHP, extensões, etc.).

2. Dependências e compatibilidade
   - Ao atualizar bibliotecas (ex.: Vue, DOMPurify), verifique breaking changes e teste componentes que dependam de comportamentos antigos.
   - Verifique se novas versões não exigem remoção de `unsafe-eval` ou outras diretivas CSP incompatíveis.

3. Segurança e CSP
   - Se mudar CSP (p.ex., removendo `unsafe-eval`), valide todos os scripts e crie/truste policies quando necessário.
   - Use `report-only` para verificar impactos antes de ativar regras restritivas.

4. Scripts e migrations
   - Execute scripts de migração em janela de manutenção. Garanta rollback scripts prontos.

5. Permissões e arquivos sensíveis
   - Verifique permissões de arquivos gerados (uploads, config) e não exponha chaves em VCS.

6. Monitoramento e logs
   - Monitore logs (HTTP 5xx, PHP) e métricas de desempenho após deploy.
   - Habilite alertas para thresholds de erro/latência.

7. Planos de rollback
   - Tenha um plano de rollback rápido (ex.: reverter commit ou restaurar backup). Teste o rollback uma vez para garantir que funciona.

8. Comunicação e documentação
   - Anote mudanças importantes em `administrador/SECURITY.md` ou changelog interno.
   - Se a atualização altera requisitos (ex.: novos env vars), atualize documentação e scripts de deploy.

9. Pós-update
   - Teste fluxos críticos (login, upload de imagens, checkout se houver) com cenários reais.
   - Verifique console do navegador, headers CSP e eventuais `report-only` que apareceram.
