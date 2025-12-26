Segurança - ImageKit

Como configurar variáveis de ambiente (local/XAMPP):

1. Editar o arquivo de configuração do Apache do XAMPP (ex.: `C:\xampp\apache\conf\extra\httpd-xampp.conf`) e adicionar em `<VirtualHost>` ou global:

   SetEnv "IMAGEKIT_PUBLIC_KEY" "public_xxx"
   SetEnv "IMAGEKIT_PRIVATE_KEY" "private_xxx"
   SetEnv "IMAGEKIT_URL" "https://ik.imagekit.io/your_endpoint"

   Depois reinicie o Apache.

2. Em Windows, outra opção é definir variáveis de ambiente de sistema (Painel de Controle > Sistema > Configurações avançadas > Variáveis de ambiente), mas é preferível usar o Apache para que GVARS estejam disponíveis ao PHP no contexto do servidor.

Hostinger:

- No painel da conta (hPanel), vá em "Site" → "Settings / Configurações" → "Environment Variables" (ou equivalente) e adicione `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` e `IMAGEKIT_URL`.

Observações de segurança:
- Nunca comite uma `.env` com chaves reais. Use `.env.example` como referência.
- Mantenha a `private key` sempre apenas no servidor; nunca a exponha ao cliente (JS/browser) nem a inclua em respostas HTML/JSON.
- Considere usar URL assinada para acesso controlado às imagens (ImageKit supporta).