# Stoffels Peças — projeto independente

Pasta: stoffelspecas. Domínio previsto: https://www.stoffelspecas.com.br.

Cópia do código completo e do catálogo em 16/10/2026: 7.969 produtos, mesmos preços, descrições, fotos, estoque interno e regras de frete. Fotos enviadas no painel foram salvas como arquivos locais para não depender do banco antigo.

## Rodar localmente

As dependências já estão instaladas. Execute `npm run dev` e abra http://localhost:3002.
A vitrine usa o catálogo local até configurar o novo banco. Login, painel administrativo, pedidos e checkout precisam do novo banco.

## Novo banco

1. Crie um projeto Supabase independente e preencha DATABASE_URL e DIRECT_URL na .env.local. Atualize config/certs/supabase-ca.crt caso o certificado CA seja diferente.
2. Execute `npm run db:migrate`.
3. Execute `npm run db:restore-clone`. Este comando importa o catálogo atualizado, preservando preços, estoque, medidas e frete grátis. Ele recusa o banco original e bancos com usuários, produtos ou pedidos.
4. Crie os administradores com `node --env-file=.env.local scripts/manage-user.mjs admin EMAIL`. A senha será solicitada sem exibição.

O snapshot local está em db/clone/catalog-snapshot.json, ignorado pelo Git e pela publicação. Não inclui clientes, senhas, sessões ou pedidos anteriores. Use db:restore-clone em vez do importador antigo db:seed para preservar todos os campos.

## Publicação independente

Crie e vincule um NOVO projeto Vercel chamado stoffelspecas. Não há vínculo .vercel nem remoto Git herdado. Configure as variáveis do novo banco e STOREFRONT_URL=https://www.stoffelspecas.com.br no novo projeto. O segredo de webhook local é novo. Configure o token de cotação do Melhor Envio e habilite CHECKOUT_ENABLED somente depois de configurar e testar o checkout. A InfiniteTag permanece stoffels, pois é a mesma empresa.

As fotos estão nesta pasta. Não configure a URL de imagens do repositório antigo; ao escolher hospedagem de imagens, use um destino próprio da nova loja. As imagens completas somam centenas de MB, portanto revise o pacote antes da primeira publicação na Vercel.

A aba Financeiro mantém os valores manuais da cópia; não representa saldo de um novo banco ou conta de pagamentos. O link de compra da Geovanna foi preservado e aponta para o mesmo link de pagamento fornecido anteriormente.

As lojas NÃO sincronizam produtos, preços, estoque, clientes ou pedidos. A conta InfinitePay é a mesma empresa e pode ser mantida, mas cada instalação usa seu domínio e webhook próprios.
