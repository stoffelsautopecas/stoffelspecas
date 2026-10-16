# Stoffels Peças

Projeto independente da loja Stoffels original.

- Publicação: https://stoffelspecas.vercel.app
- Domínio previsto: www.stoffelspecas.com.br (DNS pendente na HostGator).
- GitHub: https://github.com/stoffelsautopecas/stoffelspecas
- Banco Supabase próprio: lcianeigsenvmhyekmnu.
- Loja Thiago: /?loja=thiago. Loja Vitor: /?loja=vitor.
- Painel: /admin. Cada administrador vê somente seus clientes e pedidos; a associação é imutável e verificada no servidor.
- Produtos, preços, estoque, categorias e dados da empresa são compartilhados entre os dois atendimentos deste projeto.
- Aba Financeiro removida.

Cada atendimento tem cadastros de clientes independentes, inclusive quando o e-mail é igual. A entrada pelo link escolhe o atendimento e mantém a escolha durante a navegação. Uma sessão de cliente de outro atendimento não autoriza acesso após a troca de link.

## Desenvolvimento

`npm ci` e `npm run dev`, porta 3002. Segredos somente em .env.local, ignorado pelo Git. Não usar credenciais da loja original.

## Publicação

Fotos importadas hospedadas neste repositório, com STOFFELS_IMAGE_BASE_URL apontando para public/images/products. Fotos recentes da cópia estão em public/images/uploads; novas fotos do painel usam o banco próprio.

`node scripts/prepare-deploy.mjs`, então `npx vercel deploy --prod --yes --archive=tgz` dentro de .deploy. O vínculo Vercel é do projeto stoffelspecas, nunca stoffels.

Quando configurar o domínio: alterar o CNAME www para fae53183148bcbb6.vercel-dns-017.com; confirmar na Vercel; atualizar STOREFRONT_URL e publicar novamente. Até lá o checkout usa o domínio vercel.app.

A InfiniteTag stoffels é a mesma empresa. Os pedidos, usuários, reservas, banco e segredo de webhook são independentes da loja original. Nenhuma etiqueta do Melhor Envio é comprada automaticamente.

## Validação

`node --env-file=.env.local scripts/test-seller-isolation.mjs`: verifica isolamento e estoque compartilhado em transação revertida, com gateway simulado.

## Cópia inicial

7.969 produtos importados com os mesmos preços e imagens da loja original em 16/10/2026. Snapshot local ignorado pelo Git em db/clone/. Não reimportar por cima do banco em uso.
