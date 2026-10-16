const sellerNames={thiago:'Thiago',vitor:'Vitor'};
let activeSeller=null;
try{const incoming=new URLSearchParams(location.search).get('loja');activeSeller=Object.hasOwn(sellerNames,incoming)?incoming:localStorage.getItem('stoffels-seller');if(!Object.hasOwn(sellerNames,activeSeller))activeSeller=null;if(activeSeller)localStorage.setItem('stoffels-seller',activeSeller);}catch{}
const sellerHeaders=()=>activeSeller?{'X-Stoffels-Seller':activeSeller}:{};
const $ = (selector, parent = document) => parent.querySelector(selector);
const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'');
const names = {'motores':'Mecânica','lataria':'Lataria & Carroceria','capos-portas-e-tampas':'Capôs, Portas & Tampas','eletrica-automotiva/modulos':'Módulos','iluminacao':'Iluminação','eletrica-automotiva':'Elétrico','som-e-multimidia':'Rádio & Som','rodas':'Rodas & Pneus','cambios':'Transmissão','interior':'Interior'};
const nav = [['Promoção','promocoes'],['Mecânica','motores'],['Lataria & Carroceria','lataria'],['Módulos','eletrica-automotiva/modulos'],['Iluminação','iluminacao'],['Elétrico','eletrica-automotiva'],['Rádio & Som','som-e-multimidia'],['Rodas & Pneus','rodas'],['Transmissão','cambios'],['Interior','interior']];
let products = [], categories = [], bySlug = new Map(), byId = new Map(), routeSequence = 0;
let shippingQuote=null,selectedShippingService=null,shippingPostalCode='',shippingBusy=false;
const cartKey=()=>JSON.stringify(cart.map(x=>({id:x.id,quantity:x.quantity})).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
let quotedCartKey='';
let cart;
try { cart = JSON.parse(localStorage.getItem('stoffels-cart-v1') || '[]'); if (!Array.isArray(cart)) cart = []; } catch {cart = [];}
cart = cart.filter(x => x && typeof x.id === 'string' && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 99);
const placeholder = '/favicon.svg';
const imageUrl = value => value.startsWith('/images/products/') && window.STOFFELS_CONFIG?.imageBaseUrl ? window.STOFFELS_CONFIG.imageBaseUrl.replace(/\/$/,'')+'/'+value.split('/').at(-1) : value;
const productUrl = p => '/' + p.slug;
const categoryTitle = slug => names[slug] || categories.find(c => c.slug === slug)?.name || slug.split('/').at(-1).replaceAll('-', ' ');

function go(url) {
 const nextSeller=new URL(url,location.origin).searchParams.get('loja');
 if(Object.hasOwn(sellerNames,nextSeller)&&nextSeller!==activeSeller){location.assign(url);return;}
  if (location.pathname + location.search !== url) history.pushState({}, '', url);
  renderRoute();
  window.scrollTo({top:0,behavior:'instant'});
  $('#category-menu').hidden = true;
  $('#category-toggle').setAttribute('aria-expanded','false');
}
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
function card(p) {
  const sale = p.price < p.originalPrice;
  return `<article class="product-card"><a class="product-image" href="${esc(productUrl(p))}"><img src="${esc(imageUrl(p.image || placeholder))}" alt="${esc(p.name)}" loading="lazy" width="280" height="230"><div class="seals">${sale ? `<span class="sale-seal">-${Math.round(100*(1-p.price/p.originalPrice))}%</span>` : ''}${p.featured ? '<span>DESTAQUE</span>' : ''}${!p.available ? '<span class="unavailable-seal">INDISPONÍVEL</span>' : ''}</div></a><a class="product-name" href="${esc(productUrl(p))}">${esc(p.name)}</a><div class="product-price">${sale ? `<del>${money(p.originalPrice)}</del>` : ''}<strong>${money(p.price)}</strong><small>Peça original ${p.brand ? esc(p.brand) : ''}</small><small>${p.freeShipping?'Frete grátis':'Frete calculado pelo CEP'}</small></div><a class="view-product" href="${esc(productUrl(p))}">Ver produto <span>→</span></a></article>`;
}
function section(title, items, link='/catalogo') { return `<section class="container showcase"><div class="section-heading"><h2>${title}</h2><a href="${link}">Ver todos <span>→</span></a></div><div class="product-grid">${items.map(card).join('')}</div></section>`; }
function home() {
  const featured = products.filter(p => p.available && p.featured).slice(-8).reverse();
  const engines = products.filter(p => p.available && p.category.startsWith('motores/motor-parcial')).slice(-8).reverse();
  const tileCategories = ['iluminacao/farois','som-e-multimidia','eletrica-automotiva/modulos','capos-portas-e-tampas/portas/maquina-vidro'];
  const tileLabels = ['Faróis','Multimídia','Módulos','Máquina de vidro'];
  return `<section class="hero home-banner"><a href="/sobre"><img src="/images/brand/banner-optimized.webp" alt="Stoffels: atendemos em nossa loja física na Rua Comandai, 1287, Centro, Guarani das Missões, RS." width="2172" height="724" fetchpriority="high"></a></section><section class="container home-welcome"><div><span class="eyebrow">STOFFELS AUTOPEÇAS</span><h1>Qual peça você procura?</h1><p>Originais e seminovas para seu veículo.</p></div><a href="/catalogo" class="welcome-link">Ver catálogo →</a></section>
  <section class="benefits container" aria-label="Vantagens"><div><span>▱</span><p><b>Envio para todo o Brasil</b><small>Consulte o frete pelo seu CEP</small></p></div><div><span>♧</span><p><b>Qualidade e procedência</b><small>Peças automotivas originais</small></p></div><div><span>✓</span><p><b>Garantia de 90 dias</b><small>Mais segurança para seu veículo</small></p></div><div><span>⚙</span><p><b>Encontre a peça certa</b><small>Busque por modelo ou aplicação</small></p></div></section>
  <section class="container highlights"><div class="section-heading"><h2>Destaque</h2></div><div class="mosaic"><a href="/catalogo?q=Jeep"><img src="/images/brand/pecas-originais-stoffels-vermelho.webp" alt="Peças originais: Jeep vermelho na identidade visual da Stoffels" width="1536" height="1024" loading="lazy" decoding="async"></a>${tileCategories.map((slug,i)=>{const p=products.find(p=>p.available && p.image && p.category===slug);return `<a class="category-highlight" href="/${slug}"><img src="${esc(imageUrl(p?.image||placeholder))}" alt="${tileLabels[i]}" width="280" height="230" loading="lazy"><strong>${tileLabels[i]}</strong></a>`;}).join('')}</div></section>
  ${section('Em destaque',featured)}
  <section class="category-section"><div class="container"><div class="section-heading"><h2>Encontre por categoria</h2><a href="/catalogo">Todo o catálogo →</a></div><div class="category-tiles">${nav.slice(1,9).map(([label,slug])=>`<a href="/${slug}"><span class="category-symbol">${{'motores':'⚙','lataria':'◇','eletrica-automotiva/modulos':'▣','iluminacao':'☼','eletrica-automotiva':'ϟ','som-e-multimidia':'♫','rodas':'◉','cambios':'⚒'}[slug]||'◇'}</span><b>${label}</b><small>Ver peças →</small></a>`).join('')}</div></div></section>
  ${section('Motores e componentes',engines,'/motores/motor-parcial')}
  <section class="brand-band"><div class="container"><div><span>STOFFELS AUTOPEÇAS</span><h2>A peça que você precisa.<br>A confiança que seu carro merece.</h2><p>Explore nosso catálogo de peças originais e seminovas.</p><a class="primary-button" href="/catalogo">Conhecer o catálogo →</a></div><span class="band-mark" aria-hidden="true">S<span>///</span></span></div></section>`;
}
function catalog(slug='') {
  const params = new URLSearchParams(location.search), q = params.get('q') || '', brand = params.get('marca') || '', availability = params.get('disponibilidade') || '', order = params.get('ordem') || 'relevancia';
  const selected = params.has('categoria') ? (params.get('categoria') || '') : (slug === 'promocoes' ? '' : slug);
  let result = products.filter(p => (!selected || p.category === selected || p.category.startsWith(selected+'/')) && (!q || fold(q).split(/\s+/).filter(Boolean).every(term=>fold(p.name+' '+p.brand+' '+p.model).includes(term))) && (!brand || p.brand === brand) && (!availability || (availability === 'sim' ? p.available : !p.available)) && (slug !== 'promocoes' || p.price < p.originalPrice));
  if (order === 'menor') result.sort((a,b)=>a.price-b.price);
  else if (order === 'maior') result.sort((a,b)=>b.price-a.price);
  else if (order === 'nome') result.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  else result.sort((a,b)=>Number(b.available)-Number(a.available)||Number(b.featured)-Number(a.featured)||Number(b.id)-Number(a.id));
  const pages = Math.max(1,Math.ceil(result.length/24)), page = Math.min(pages,Math.max(1,Number(params.get('pagina'))||1));
  const brands = [...new Set(products.filter(p=>!selected || p.category===selected || p.category.startsWith(selected+'/')).map(p=>p.brand).filter(Boolean))].sort();
  const title = q ? `Resultados para “${esc(q)}”` : slug === 'promocoes' ? 'Ofertas & Promoções' : selected ? esc(categoryTitle(selected)) : 'Catálogo de peças';
  return `<div class="container catalog-page"><div class="breadcrumbs"><a href="/">Início</a><span>›</span><span>${title}</span></div><div class="catalog-heading"><div><h1>${title}</h1><p>${result.length.toLocaleString('pt-BR')} produtos encontrados</p></div><label class="sort">Ordenar por<select id="sort"><option value="relevancia" ${order==='relevancia'?'selected':''}>Mais relevantes</option><option value="menor" ${order==='menor'?'selected':''}>Menor preço</option><option value="maior" ${order==='maior'?'selected':''}>Maior preço</option><option value="nome" ${order==='nome'?'selected':''}>Nome do produto</option></select></label></div>
  <div class="catalog-layout"><details class="filters"><summary>Filtrar produtos <span>⌄</span></summary><form id="filters"><label>Categoria<select name="categoria"><option value="">Todas as categorias</option>${categories.sort((a,b)=>a.slug.localeCompare(b.slug)).map(c=>`<option value="${esc(c.slug)}" ${c.slug===selected?'selected':''}>${c.slug.includes('/')?'↳ ':''}${esc(names[c.slug]||c.name)} (${c.count})</option>`).join('')}</select></label><label>Marca<select name="marca"><option value="">Todas as marcas</option>${brands.map(b=>`<option ${b===brand?'selected':''}>${esc(b)}</option>`).join('')}</select></label><label>Disponibilidade<select name="disponibilidade"><option value="">Todos os produtos</option><option value="sim" ${availability==='sim'?'selected':''}>Disponíveis</option><option value="nao" ${availability==='nao'?'selected':''}>Indisponíveis</option></select></label><button class="primary-button" type="submit">Aplicar filtros</button><a class="clear-filters" href="/catalogo">Limpar filtros</a></form><div class="filter-help"><b>Encontrou sua peça?</b><p>Confira o modelo, ano e código da peça para garantir a compatibilidade.</p></div></details><div><div class="product-grid catalog-grid">${result.slice((page-1)*24,page*24).map(card).join('') || '<div class="empty"><h2>Nenhuma peça encontrada</h2><p>Tente buscar por outra marca, modelo ou nome.</p><a href="/catalogo" class="primary-button">Ver todo o catálogo</a></div>'}</div><nav class="pagination" aria-label="Paginação">${page>1?`<button data-page="${page-1}" aria-label="Página anterior">←</button>`:''}${[...new Set([1,...Array.from({length:5},(_,i)=>page-2+i).filter(n=>n>1&&n<pages),pages])].map((n,i,arr)=>`${i&&n-arr[i-1]>1?'<span>…</span>':''}<button data-page="${n}" ${n===page?'aria-current="page" class="active"':''}>${n}</button>`).join('')}${page<pages?`<button data-page="${page+1}" aria-label="Próxima página">→</button>`:''}</nav></div></div></div>`;
}
function categoryPage() {
  const roots = categories.filter(c=>!c.slug.includes('/')).sort((a,b)=>categoryTitle(a.slug).localeCompare(categoryTitle(b.slug),'pt-BR'));
  return `<section class="container categories-page"><div class="page-intro"><span class="eyebrow">ENCONTRE SUA PEÇA</span><h1>Categorias</h1><p>Explore as linhas de peças para seu veículo.</p></div><div class="category-directory">${roots.map(c=>{const p=products.find(p=>p.available&&p.image&&(p.category===c.slug||p.category.startsWith(c.slug+'/')));return `<a href="/${esc(c.slug)}"><img src="${esc(imageUrl(p?.image||placeholder))}" alt="" width="120" height="100" loading="lazy"><b>${esc(categoryTitle(c.slug))}</b><small>${c.count.toLocaleString('pt-BR')} peças <span>→</span></small></a>`;}).join('')}</div></section>`;
}
function syncLayout(slug) {
  document.body.classList.toggle('has-purchase-bar',Boolean($('#main [data-add]')));
  const active = ['minha-conta','admin'].includes(slug) ? 'account' : !slug ? 'home' : slug==='categorias' ? 'categories' : slug==='catalogo' ? 'search' : 'categories';
  document.querySelectorAll('[data-mobile-tab]').forEach(el=>{
    el.classList.toggle('active',el.dataset.mobileTab===active);
    if(el.dataset.mobileTab===active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
  });
  const filters=$('details.filters');
  if(filters)filters.open=Boolean(window.matchMedia?.('(min-width: 960px)').matches);
}
function productPage(p) {
  const related = products.filter(x => x.id !== p.id && x.category === p.category && x.available).slice(0,4);
  return `<div class="container product-page"><div class="breadcrumbs"><a href="/">Início</a><span>›</span><a href="/${esc(p.category)}">${esc(p.categoryName||categoryTitle(p.category))}</a><span>›</span><span>${esc(p.name)}</span></div><div class="product-detail"><section class="gallery" aria-label="Galeria de fotos"><button id="zoom-photo" class="main-photo" aria-label="Ampliar foto do produto"><img id="main-photo" src="${esc(imageUrl(p.images[0]||placeholder))}" alt="${esc(p.name)}" width="650" height="550"><span>⌕ Ampliar imagem</span></button><div class="thumbnails">${p.images.map((img,i)=>`<button data-photo="${esc(imageUrl(img))}" class="${i===0?'selected':''}" aria-label="Ver foto ${i+1}"><img src="${esc(imageUrl(img))}" alt="Foto ${i+1} de ${esc(p.name)}" width="80" height="80" loading="lazy"></button>`).join('')}</div></section><section class="purchase"><div class="detail-badges"><span>PEÇA ORIGINAL</span>${p.featured?'<span>DESTAQUE</span>':''}</div><h1>${esc(p.name)}</h1><p class="product-reference">Código do catálogo: ${esc(p.id)} ${p.brand?'· Marca: '+esc(p.brand):''}</p><div class="availability ${p.available?'available':''}"><i></i>${p.available?'Produto disponível':'Produto indisponível no catálogo de origem'}</div><div class="detail-price">${p.price<p.originalPrice?`<del>${money(p.originalPrice)}</del>`:''}<strong>${money(p.price)}</strong></div>${p.available?`<div class="purchase-actions"><label>Quantidade<input type="number" min="1" max="99" value="1" id="quantity" aria-label="Quantidade"></label><button class="primary-button" data-add="${p.id}">Adicionar ao carrinho</button></div>`:'<p class="stock-note">Este produto permanece no catálogo para consulta. No momento, ele não está disponível para compra.</p>'}<p class="checkout-note">Pague com Pix ou cartão de crédito pela InfinitePay.</p><div class="detail-assurances"><p>✓ ${p.freeShipping?'Frete grátis para este produto':'Consulte o frete pelo CEP no carrinho'}</p><p>✓ Garantia de 90 dias</p><p>✓ Fotos da peça disponíveis na galeria</p><p>✓ Confira o código e a aplicação antes de comprar</p></div></section></div><section class="description"><h2>Detalhes e aplicação da peça</h2><div class="description-content">${p.description || '<p>Confira as fotos, o modelo e a aplicação da peça. Informações adicionais não estão disponíveis no catálogo de origem.</p>'}</div>${p.model?`<p><strong>Modelo:</strong> ${esc(p.model)}</p>`:''}</section></div>${related.length?section('Produtos relacionados',related,'/'+p.category):''}`;
}
async function renderRoute() {
  const sequence = ++routeSequence;
  document.body.classList.toggle('admin-mode',location.pathname.replace(/\/$/,'')==='/admin');
  const slug = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g,'');
  document.body.classList.toggle('home-mode',slug==='');
  if(!['admin','minha-conta','pagamento','definir-senha','privacidade','trocas','sobre'].includes(slug)&&!slug.startsWith('pedido/')){
    if(!catalogReady){$('#main').innerHTML=slug===''?home():'<section class="container loading">Carregando peças…</section>';try{await ensureCatalog();}catch{if(sequence===routeSequence)$('#main').innerHTML='<section class="container empty"><h1>Não foi possível carregar as peças</h1><a href="/catalogo">Tentar novamente</a></section>';return;}if(sequence!==routeSequence)return;}
  }
  const p = bySlug.get(slug);
  document.body.classList.remove('has-purchase-bar');
  $('meta[name="description"]').content = 'Encontre peças automotivas originais e seminovas na Stoffels. Motores, lataria, faróis, câmbios e acessórios.';
  $('#search input').value = new URLSearchParams(location.search).get('q') || '';
  if(['checkout','pagamento','privacidade','trocas','definir-senha'].includes(slug)||slug.startsWith('pedido/')){
    $('#main').innerHTML='<section class="container loading">Carregando…</section>';
    try{
      if(slug==='checkout')await checkoutPage(sequence);
      else if(slug==='pagamento'||slug.startsWith('pedido/'))await purchasePage(sequence);
      else if(slug==='definir-senha'){$('#main').innerHTML=`<section class="container account-page"><div class="account-card"><h1>Definir senha de acesso</h1><form id="account-form" data-action="reset"><input type="hidden" name="token" value="${esc(new URLSearchParams(location.search).get('token')||'')}">${field('Nova senha','password','','type="password" required minlength="12" maxlength="256" autocomplete="new-password"')}<small>Use pelo menos 12 caracteres.</small>${formMessage}<button class="primary-button" type="submit">Salvar senha e entrar</button></form></div></section>`;}
      else $('#main').innerHTML=legalPage(slug);
    }catch(error){if(sequence===routeSequence)$('#main').innerHTML=`<section class="container empty"><h1>Não foi possível carregar</h1><p>${esc(error.message)}</p><a href="/minha-conta">Minha conta</a></section>`;}
    if(sequence===routeSequence){document.title='Stoffels | '+({'checkout':'Finalizar compra','pagamento':'Pedido','privacidade':'Privacidade','trocas':'Trocas e devoluções','definir-senha':'Definir senha'}[slug]||'Pedido');syncLayout(slug);}return;
  }
  if (slug==='minha-conta'||slug==='admin') {await accountPage(slug,sequence);document.title=(slug==='admin'?'Administração':'Minha conta')+' | Stoffels';syncLayout(slug);return;}
  if (p) {
    $('#main').innerHTML = '<div class="container loading">Carregando detalhes da peça…</div>';
    try {
      const response = await fetch(window.STOFFELS_CONFIG?.databaseApi ? `/api/product?id=${p.id}` : `/data/products/${p.id}.json`);
      if (!response.ok) throw new Error();
      const full = await response.json();
      if (sequence !== routeSequence) return;
      $('#main').innerHTML = productPage(full);
      document.title = p.name+' | Stoffels';
      $('meta[name="description"]').content = `${p.name}. ${full.brand || ''} Confira fotos, preço e aplicação na Stoffels.`;
    } catch {
      if (sequence === routeSequence) $('#main').innerHTML = '<div class="container empty"><h1>Não foi possível carregar esta peça</h1><p>Atualize a página para tentar novamente.</p><a href="/catalogo">Voltar ao catálogo</a></div>';
    }
  } else if (!slug) { $('#main').innerHTML = home(); document.title = 'Stoffels | Autopeças Originais e Seminovas'; }
  else if (slug === 'sobre') { $('#main').innerHTML = '<section class="container about"><span class="eyebrow">STOFFELS AUTOPEÇAS</span><h1>Peças originais.<br>Novos caminhos.</h1><p>Encontre peças automotivas originais e seminovas para seu veículo. Nosso catálogo reúne motores, lataria, iluminação, transmissão e acessórios de diversas marcas.</p><a class="primary-button" href="/catalogo">Explorar catálogo →</a></section>'; document.title='Sobre a Stoffels | Autopeças'; }
  else if (slug==='categorias') {$('#main').innerHTML=categoryPage();document.title='Categorias | Stoffels';}
  else if (['catalogo','promocoes'].includes(slug)||categories.some(c=>c.slug===slug)) { $('#main').innerHTML = catalog(['catalogo','categorias'].includes(slug)?'':slug); document.title = (slug==='catalogo'?'Catálogo':categoryTitle(slug))+' | Stoffels'; }
  else { $('#main').innerHTML='<section class="container empty"><h1>Página não encontrada</h1><a class="primary-button" href="/catalogo">Voltar ao catálogo</a></section>'; document.title='Página não encontrada | Stoffels'; }
  syncLayout(slug);
}
function saveCart() { try {localStorage.setItem('stoffels-cart-v1',JSON.stringify(cart));} catch {} const amount=cart.reduce((n,x)=>n+x.quantity,0);$('#cart-count').textContent=amount;$('#mobile-cart-count').textContent=amount;$('#mobile-cart-count').hidden=amount===0; }
function cartContent() {
  const cartTarget=location.pathname==='/checkout'?$('#checkout-cart'):$('#cart-content');if(!cartTarget)return;
  if(quotedCartKey!==cartKey()||shippingQuote&&new Date(shippingQuote.expiresAt)<=new Date()){shippingQuote=null;selectedShippingService=null;}
  const entries = cart.map(item=>({...item,p:byId.get(item.id)})).filter(item=>item.p);
  const total = entries.reduce((n,item)=>n+item.p.price*item.quantity,0);
  cartTarget.innerHTML = entries.length ? `${entries.map(({p,quantity})=>`<div class="cart-item"><img src="${esc(imageUrl(p.image||placeholder))}" alt="${esc(p.name)}" width="80" height="80"><div><a href="${esc(productUrl(p))}" data-close-cart>${esc(p.name)}</a><strong>${money(p.price)}</strong><div class="cart-controls"><button data-quantity="${p.id}" data-delta="-1" aria-label="Diminuir quantidade">−</button><span>${quantity}</span><button data-quantity="${p.id}" data-delta="1" aria-label="Aumentar quantidade">+</button><button data-remove="${p.id}" class="remove">Remover</button></div>${!p.available?'<small>Produto indisponível</small>':''}</div></div>`).join('')}<div class="cart-total"><span>Subtotal</span><strong>${money(total)}</strong></div>${shippingCalculator()}<div class="cart-total"><span>Frete</span><strong>${selectedShippingService?(selectedShippingService.priceCents===0?'Grátis':money(selectedShippingService.priceCents/100)):"A calcular"}</strong></div><div class="cart-total"><span>${selectedShippingService?"Total com frete":"Subtotal dos produtos"}</span><strong>${money(total+(selectedShippingService?.priceCents||0)/100)}</strong></div>${location.pathname!=='/checkout'?'<button class="primary-button" id="go-checkout">Finalizar compra</button>':''}<button class="secondary-button" id="continue-shopping">Continuar comprando</button>`:'<div class="empty"><h3>Seu carrinho está vazio</h3><p>Encontre a peça que seu carro precisa.</p><button class="primary-button" id="continue-shopping">Ver catálogo</button></div>';
  const pay=$('#pay-order');if(pay)pay.disabled=!selectedShippingService||checkoutSubmitting;
}
const dialogs = {
  support:['Fale com a Stoffels','Atendimento pelo WhatsApp: (55) 99671-2043. Você também pode enviar mensagens na página do seu pedido.'],
  warranty:['Garantia das peças','As peças do catálogo de origem têm garantia de 90 dias. Confira o estado, o código e a aplicação da peça antes da compra. Para solicitar atendimento, acesse seu pedido ou fale pelo WhatsApp (55) 99671-2043.'],
  shipping:['Envio e entrega','Informe seu CEP no carrinho para consultar transportadoras, valores e prazos. O frete selecionado é somado ao total das peças. A disponibilidade depende das condições de transporte de cada peça.'],
  compatibility:['Compatibilidade','Confira marca, modelo, ano, motorização e código original da peça. A semelhança visual não garante compatibilidade. Consulte um profissional antes da instalação.']
};
document.addEventListener('click', async event => {
  const anchor = event.target.closest('a');
  if (anchor && (!anchor.target||anchor.target==='_self') && !anchor.hasAttribute('download') && anchor.origin === location.origin && !anchor.hash && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button===0) { event.preventDefault(); if (anchor.hasAttribute('data-close-cart')) $('#cart-dialog').close(); go(anchor.pathname+anchor.search); return; }
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.dialog==='account') {go('/minha-conta');return;}
  if (target.dataset.dialog) { const [title,text]=dialogs[target.dataset.dialog]; $('#dialog-content').innerHTML=`<h2>${title}</h2><p>${text}</p>`; $('#info-dialog').showModal(); }
  if (target.id==='dialog-close') $('#info-dialog').close();
  if (target.id==='category-toggle') { if(!catalogReady){try{await ensureCatalog();}catch{toast('Não foi possível carregar as categorias.');return;}} $('#category-menu').hidden=!$('#category-menu').hidden; target.setAttribute('aria-expanded',String(!$('#category-menu').hidden)); }
  if (target.id==='cart-toggle' || target.hasAttribute('data-open-cart')) { try{if(!catalogReady)await ensureCatalog();cartContent(); $('#cart-dialog').showModal();}catch{toast('Não foi possível carregar o carrinho. Tente novamente.');} }
  if (target.hasAttribute('data-mobile-search')) {go('/catalogo');$('#search input').focus();}
  if (target.id==='cart-close') $('#cart-dialog').close();
  if (target.id==='continue-shopping') { $('#cart-dialog').close(); go('/catalogo'); }
  if (target.dataset.add) { const p=byId.get(target.dataset.add); if (!p?.available) return; const quantity=Math.min(99,Math.max(1,Math.floor(Number($('#quantity')?.value)||1))); const existing=cart.find(x=>x.id===p.id); if(existing)existing.quantity=Math.min(99,existing.quantity+quantity);else cart.push({id:p.id,quantity});saveCart();cartContent();if(!$('#cart-dialog').open)$('#cart-dialog').showModal(); }
  if (target.dataset.remove) { cart=cart.filter(x=>x.id!==target.dataset.remove);saveCart();cartContent(); }
  if (target.dataset.quantity) { const item=cart.find(x=>x.id===target.dataset.quantity);if(item)item.quantity=Math.min(99,item.quantity+Number(target.dataset.delta));cart=cart.filter(x=>x.quantity>0);saveCart();cartContent(); }
  if (target.dataset.photo) { $('#main-photo').src=target.dataset.photo;document.querySelectorAll('[data-photo]').forEach(x=>x.classList.toggle('selected',x===target)); }
  if (target.id==='zoom-photo') { $('#dialog-content').innerHTML=`<img class="zoomed" src="${esc($('#main-photo').src)}" alt="${esc($('#main-photo').alt)}">`;$('#info-dialog').showModal(); }
  if (target.dataset.page) { const params=new URLSearchParams(location.search);params.set('pagina',target.dataset.page);go(location.pathname+'?'+params); }
});
document.addEventListener('submit',event=>{
  if(event.target.id==='search'){event.preventDefault();const q=$('#search input').value.trim();go('/catalogo'+(q?'?q='+encodeURIComponent(q):''));}
  if(event.target.id==='filters'){event.preventDefault();applyFilters(event.target);}
});
function applyFilters(form) {
  const wasOpen=Boolean(form.closest('details')?.open);
  const scrollTop=window.scrollY;
  const params=new URLSearchParams(location.search);
  const data=new FormData(form);
  const category=String(data.get('categoria') || '');
  const brand=String(data.get('marca') || '');
  // Ao trocar de categoria, uma marca incompatível não pode continuar escondida no filtro.
  if(brand && !products.some(p=>p.brand===brand && (!category || p.category===category || p.category.startsWith(category+'/')))) data.set('marca','');
  params.delete('pagina');
  for(const [key,value] of data) {if(value)params.set(key,String(value));else params.delete(key);}
  const route=location.pathname==='/promocoes'?'/promocoes':'/catalogo';
  const query=params.toString();
  go(route+(query?'?'+query:''));
  const panel=$('details.filters');
  if(panel && wasOpen)panel.open=true;
  window.scrollTo({top:scrollTop,behavior:'instant'});
}
document.addEventListener('change',event=>{
  if(event.target.id==='sort'){const params=new URLSearchParams(location.search);params.set('ordem',event.target.value);params.delete('pagina');go(location.pathname+'?'+params);}
  else if(event.target.matches('#filters select'))applyFilters(event.target.closest('form'));
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('#category-menu').hidden=true;$('#category-toggle').setAttribute('aria-expanded','false');}});
document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap')){$('#category-menu').hidden=true;$('#category-toggle').setAttribute('aria-expanded','false');}});
for (const d of document.querySelectorAll('dialog')) d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
window.addEventListener('popstate',renderRoute);
window.matchMedia?.('(min-width: 960px)').addEventListener('change',()=>{const filters=$('details.filters');if(filters)filters.open=window.matchMedia('(min-width: 960px)').matches;});
$('#year').textContent = new Date().getFullYear();
$('#primary-nav').innerHTML=nav.map(([name,slug],i)=>`<a href="/${slug}" class="${i===0?'promotion':''}">${name}<span>⌄</span></a>`).join('');
function deliveryDescription(option){return Number.isInteger(option?.deliveryDays)?`${option.deliveryDays} dia(s) útil(eis) após a postagem`:'Transporte e prazo combinados com a Stoffels';}
function shippingCalculator(){
 return `<section class="shipping-calculator"><h3>Entrega</h3><form id="shipping-form"><label for="shipping-cep">CEP de destino</label><div class="shipping-input"><input id="shipping-cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" pattern="[0-9]{5}-?[0-9]{3}" value="${esc(shippingPostalCode)}" required><button type="submit" class="primary-button" ${shippingBusy?'disabled':''}>${shippingBusy?'Consultando…':'Calcular frete'}</button></div><p id="shipping-message" class="form-message" role="status" aria-live="polite"></p></form>${shippingQuote?`<fieldset class="shipping-options"><legend>Escolha a entrega</legend>${shippingQuote.options.map(option=>`<label><input type="radio" name="shipping-service" value="${esc(option.serviceId)}" ${selectedShippingService?.serviceId===option.serviceId?'checked':''}><span><b>${esc(option.carrier)} · ${esc(option.name)}</b><small>${esc(deliveryDescription(option))}</small></span><strong>${option.priceCents===0?'Grátis':money(option.priceCents/100)}</strong></label>`).join('')}</fieldset>${shippingQuote.estimated?'<small>Peso e embalagem estimados. As medidas precisam ser conferidas antes do envio.</small>':''}`:''}<small>${shippingQuote?.options.some(option=>option.freeFallback||option.freePromotion)?'Transporte organizado pela Stoffels, sem custo de frete para você.':'Prazo de transporte após a postagem. A disponibilidade depende das peças e do destino.'}</small></section>`;
}
document.addEventListener('submit',async event=>{
 if(event.target.id!=='shipping-form')return;
 event.preventDefault();if(shippingBusy)return;
 shippingPostalCode=event.target.elements.cep.value;
 const delivery=$('#checkout-form [name=cep]');if(delivery)delivery.value=shippingPostalCode;
 const requestedCartKey=cartKey(),items=cart.map(x=>({id:x.id,quantity:x.quantity}));
 shippingBusy=true;shippingQuote=null;selectedShippingService=null;cartContent();
 try{
  const response=await fetch('/api/shipping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cep:shippingPostalCode,items})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível calcular o frete.');
  if(requestedCartKey!==cartKey())throw new Error('O carrinho mudou. Calcule o frete novamente.');
  shippingQuote=result;selectedShippingService=result.options.length===1&&(result.options[0].freeFallback||result.options[0].freePromotion)?result.options[0]:null;quotedCartKey=requestedCartKey;shippingBusy=false;cartContent();
 }catch(error){shippingBusy=false;cartContent();const message=$('#shipping-message');if(message)message.textContent=error.message;}
});
document.addEventListener('input',event=>{
 if(event.target.id!=='shipping-cep')return;
 shippingPostalCode=event.target.value;
 if(shippingQuote){const caret=event.target.selectionStart;shippingQuote=null;selectedShippingService=null;cartContent();const input=$('#shipping-cep');input.focus();input.setSelectionRange(caret,caret);}
});
document.addEventListener('change',event=>{
 if(event.target.name==='shipping-service'){
  if(!shippingQuote||new Date(shippingQuote.expiresAt)<=new Date()||quotedCartKey!==cartKey()){cartContent();return;}
  selectedShippingService=shippingQuote.options.find(x=>x.serviceId===event.target.value)||null;cartContent();
 }
});
async function accountApi(action,data={}) {
  const response=await fetch('/api/auth',action?{method:'POST',headers:{'Content-Type':'application/json',...sellerHeaders()},body:JSON.stringify({action,...data})}:{headers:sellerHeaders()});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível acessar sua conta.');return result;
}
function loginForm(admin=false) {
  const register=!admin&&new URLSearchParams(location.search).get('cadastro')==='1',buying=new URLSearchParams(location.search).get('next')==='/checkout';
  return `<section class="container account-page"><div class="account-card"><span class="eyebrow">${admin?'ADMINISTRAÇÃO':'MINHA CONTA'}</span><h1>${register?'Criar minha conta':admin?'Entrar no painel':'Entrar na minha conta'}</h1><p>${admin?'Acesso exclusivo da equipe Stoffels.':register&&buying?'Crie sua conta para continuar a compra. Seu carrinho será mantido.':'Acesse sua conta na Stoffels.'}</p><form id="account-form" data-action="${register?'register':'login'}">${register?'<label>Nome completo<input name="name" autocomplete="name" minlength="2" maxlength="100" required></label>':''}<label>E-mail<input name="email" type="email" autocomplete="username" maxlength="254" required></label><label>Senha<input name="password" type="password" autocomplete="${register?'new-password':'current-password'}" ${register?'minlength="12"':''} maxlength="256" required></label>${register?'<small>Use pelo menos 12 caracteres.</small>':''}<p class="form-message" role="status" aria-live="polite"></p><button class="primary-button" type="submit">${register?(buying?'Cadastrar e continuar compra':'Criar conta'):'Entrar'}</button></form>${admin?'<a href="/minha-conta">Acesso do cliente →</a>':`<a href="/minha-conta?${new URLSearchParams({...(!register?{cadastro:'1'}:{}),...(new URLSearchParams(location.search).get('next')?{next:new URLSearchParams(location.search).get('next')}:{})})}">${register?'Já tenho uma conta':'Quero criar minha conta'} →</a>`}<p class="account-help">Esqueceu a senha? <a href="https://wa.me/5555996712043" target="_blank" rel="noopener noreferrer">Fale com a loja para recuperar o acesso.</a></p></div></section>`;
}
document.addEventListener('submit',async event=>{
 if(event.target.id!=='account-form')return;
 event.preventDefault();const form=event.target,button=form.querySelector('button[type="submit"],button:not([type])'),message=form.querySelector('.form-message');
 button.disabled=true;message.textContent='Aguarde…';
 try{
  const result=await accountApi(form.dataset.action,Object.fromEntries(new FormData(form)));
  if(form.dataset.action==='password'){form.reset();message.textContent=result.message;}else if(form.dataset.action==='reset'){history.replaceState({},'',result.user.role==='admin'?'/admin':'/minha-conta');await renderRoute();}else{const next=new URLSearchParams(location.search).get('next');if(next&&next.startsWith('/')&&!next.startsWith('//'))go(next);else await renderRoute();}
 }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-logout]');if(!button)return;button.disabled=true;
 try{await accountApi('logout');go(location.pathname==='/admin'?'/admin':'/minha-conta');}
 catch(error){const message=$('#main .form-message');if(message)message.textContent=error.message;}finally{button.disabled=false;}
});

let storeInfo={name:'Stoffels Autopeças',phone:'55996712043',cnpj:'04.966.153/0001-49',address:'Rua Comandai, 1287 - Centro, Guarani das Missões/RS, CEP 97950-000',dispatchDays:0};
let checkoutSubmitting=false,checkoutCustomer=null,accountAddresses=[];
const statusLabel=value=>({pending:'Preparando pagamento',checkout_created:'Aguardando pagamento',paid:'Pagamento confirmado',cancelled:'Cancelado',failed:'Pagamento não iniciado',awaiting_payment:'Aguardando pagamento',processing:'Em preparação',shipped:'Enviado',delivered:'Entregue'}[value]||value);
const dateLabel=value=>new Date(value).toLocaleString('pt-BR');
async function api(url,body){const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json',...sellerHeaders()},body:JSON.stringify(body)}:{headers:sellerHeaders()});let data;try{data=await response.json();}catch{throw new Error('Resposta inválida. Atualize a página e tente novamente.');}if(!response.ok){const error=new Error(data.error||'Não foi possível concluir a solicitação.');error.status=response.status;throw error;}return data;}
function field(label,name,value='',options=''){return `<label>${label}<input name="${name}" value="${esc(value??'')}" ${options}></label>`;}
const formMessage='<p class="form-message" role="status" aria-live="polite"></p>';
const states='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
function addressFields(a={}){return `<div class="form-grid">${field('Destinatário','receiver',a.receiver,'required maxlength="100" autocomplete="name"')}${field('CEP','cep',a.cep||shippingPostalCode,'required inputmode="numeric" maxlength="9" pattern="[0-9]{5}-?[0-9]{3}" autocomplete="postal-code"')}<p class="cep-feedback" role="status" aria-live="polite"></p>${field('Rua / Avenida','street',a.street,'required maxlength="150" autocomplete="address-line1"')}${field('Número','number',a.number,'required maxlength="20"')}${field('Complemento','complement',a.complement,'maxlength="150" autocomplete="address-line2"')}${field('Bairro','neighborhood',a.neighborhood,'required maxlength="100"')}${field('Cidade','city',a.city,'required maxlength="100" autocomplete="address-level2"')}<label>Estado<select name="state" required><option value="">Selecione</option>${states.map(x=>`<option ${a.state===x?'selected':''}>${x}</option>`).join('')}</select></label></div>`;}
function addressText(a){return a?`${esc(a.receiver)}<br>${esc(a.street)}, ${esc(a.number)} ${esc(a.complement||'')}<br>${esc(a.neighborhood)} · ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.cep)}`:'';}
function orderList(orders,admin=false){return orders.length?`<div class="order-list">${orders.map(o=>`<a class="order-card" href="${admin?'/admin?tab=orders&id=':'/pedido/'}${o.id}"><div><b>Pedido ${esc(o.id.slice(0,8).toUpperCase())}</b><small>${dateLabel(o.createdAt)}</small>${admin?`<span>${esc(o.customerName||'Cliente')}</span>`:''}</div><div><span class="status-pill">${esc(statusLabel(o.status))}</span><small>${esc(statusLabel(o.fulfillmentStatus||o.fulfillment_status))}</small><strong>${money(o.totalCents/100)}</strong></div></a>`).join('')}</div>`:'<div class="empty-panel"><h3>Nenhum pedido por aqui</h3><p>Os pedidos aparecerão nesta página assim que forem criados.</p></div>';}
function orderMarkup(o,admin=false){return `<div class="panel-heading"><div><span class="eyebrow">PEDIDO ${esc(o.id.slice(0,8).toUpperCase())}</span><h1>${esc(statusLabel(o.status))}</h1><p>${dateLabel(o.createdAt)}</p></div><a href="${admin?'/admin?tab=orders':'/minha-conta'}">← Voltar</a></div>${o.paymentReview?'<p class="notice">Este pagamento está em conferência pela equipe da loja.</p>':''}<div class="management-grid"><section class="panel"><h2>Itens do pedido</h2>${o.items.map(p=>`<div class="order-line"><div><b>${esc(p.name)}</b><small>${p.quantity} × ${money(p.unitPriceCents/100)}</small></div><strong>${money(p.quantity*p.unitPriceCents/100)}</strong></div>`).join('')}<div class="cart-total"><span>Produtos</span><strong>${money(o.subtotalCents/100)}</strong></div><div class="cart-total"><span>Frete · ${esc(o.shipping?.carrier||'Entrega')}</span><strong>${money(o.shippingCents/100)}</strong></div><div class="cart-total"><span>Total</span><strong>${money(o.totalCents/100)}</strong></div>${o.checkoutUrl?`<a class="primary-button" href="${esc(o.checkoutUrl)}" rel="noreferrer">Pagar com Pix ou cartão</a>`:''}${o.checkoutState==='uncertain'&&o.status!=='paid'?'<p class="notice">O pedido foi registrado, mas a geração do link está em conferência. Acompanhe por aqui ou fale com a loja antes de criar outra compra.</p>':''}${o.status==='failed'?'<p>O pagamento não foi iniciado. Você pode voltar ao catálogo e criar uma nova compra.</p>':''}${o.status==='paid'?`<p class="success-note">✓ Pagamento confirmado pela InfinitePay${o.paidAt?' em '+dateLabel(o.paidAt):''}.</p>`:''}</section><section class="panel"><h2>Entrega</h2><p>${addressText(o.address)}</p><p><b>${esc(statusLabel(o.fulfillmentStatus))}</b></p>${o.trackingCode?`<p>Código de rastreio: <strong>${esc(o.trackingCode)}</strong></p>`:''}${o.trackingUrl?`<a href="${esc(o.trackingUrl)}" target="_blank" rel="noopener noreferrer">Acompanhar entrega →</a>`:''}${o.shipping?`<p>Transporte: ${esc(o.shipping.carrier)} · ${esc(o.shipping.name)}<br>${esc(deliveryDescription(o.shipping))}.</p>`:''}<p>Cliente: ${esc(o.customerName)}<br>${esc(o.customerEmail)}<br>${esc(o.customerPhone||'')}</p></section></div><section class="panel"><h2>Atendimento deste pedido</h2><p>Use este espaço para dúvidas, pedidos de cancelamento, troca ou devolução.</p><div class="message-list">${o.messages.map(m=>`<div class="order-message ${m.role==='admin'?'staff':''}"><b>${esc(m.role==='admin'?'Equipe Stoffels':m.name)}</b><small>${dateLabel(m.created_at)}</small><p>${esc(m.body).replace(/\n/g,'<br>')}</p></div>`).join('')||'<p>Nenhuma mensagem ainda.</p>'}</div><form id="order-message-form" data-order="${o.id}" data-admin="${admin}"><label>Mensagem<textarea name="message" required minlength="2" maxlength="2000" rows="3"></textarea></label>${formMessage}<button class="primary-button">Enviar mensagem</button></form></section>`;}
async function accountPage(slug,sequence){
 const admin=slug==='admin';
 if(admin){
  const content=$('.admin-content');if(content)content.innerHTML='<section class="panel loading" role="status">Carregando…</section>';else $('#main').innerHTML='<section class="container loading" role="status">Carregando painel…</section>';
  try{await adminPage(null,sequence);}catch(error){if(sequence!==routeSequence)return;if(error.status===401)$('#main').innerHTML=loginForm(true);else if(error.status===403)$('#main').innerHTML='<section class="container account-page"><div class="account-card"><h1>Acesso restrito</h1><p>Esta conta não tem permissão para acessar a administração.</p><a href="/minha-conta">Minha conta</a><button class="secondary-button" data-logout>Sair da conta</button></div></section>';else $('#main').innerHTML=`<section class="container account-page"><div class="account-card"><h1>Não foi possível carregar o painel</h1><p>${esc(error.message)}</p><a href="/admin">Tentar novamente</a></div></section>`;}return;
 }
 $('#main').innerHTML='<section class="container loading">Carregando sua conta…</section>';
 try{const {user}=await accountApi();if(sequence!==routeSequence)return;
  if(!user){$('#main').innerHTML=loginForm(admin);return;}

  const [profile,purchases]=await Promise.all([api('/api/customer'),api('/api/orders')]);if(sequence!==routeSequence)return;accountAddresses=profile.addresses;
  $('#main').innerHTML=`<section class="container management-page"><div class="panel-heading"><div><span class="eyebrow">MINHA CONTA</span><h1>Olá, ${esc(user.name)}</h1><p>${esc(user.email)}</p></div><button class="secondary-button" data-logout>Sair da conta</button></div>${user.role==='admin'?'<a class="text-link" href="/admin">Abrir administração →</a>':''}<section class="panel"><h2>Meus pedidos</h2>${orderList(purchases.orders)}</section><div class="management-grid"><section class="panel"><h2>Meus dados</h2><form id="profile-form">${field('Nome completo','name',user.name,'required minlength="2" maxlength="100" autocomplete="name"')}${field('Telefone com DDD','phone',profile.user.phone,'required type="tel" autocomplete="tel-national"')}${formMessage}<button class="primary-button">Salvar dados</button></form><h2>Segurança</h2><form id="account-form" data-action="password">${field('Senha atual','currentPassword','','type="password" autocomplete="current-password" required maxlength="256"')}${field('Nova senha','password','','type="password" autocomplete="new-password" minlength="12" maxlength="256" required')}<small>A troca encerra os outros acessos à conta.</small>${formMessage}<button class="secondary-button">Alterar senha</button></form></section><section class="panel"><h2>Meus endereços</h2>${profile.addresses.map(a=>`<div class="saved-address"><b>${esc(a.label)}</b><p>${addressText(a.address)}</p><div class="button-row"><button type="button" class="text-button" data-edit-address="${a.id}">Editar endereço</button><button type="button" class="text-button" data-delete-address="${a.id}">Remover endereço</button></div></div>`).join('')||'<p>Salve um endereço para agilizar suas próximas compras.</p>'}<details class="address-editor"><summary>Adicionar endereço</summary><form id="address-form"><input type="hidden" name="id" value="">${field('Nome do endereço','label','Casa','required maxlength="50"')}${addressFields({receiver:user.name})}${formMessage}<button class="primary-button">Salvar endereço</button></form></details></section></div></section>`;
 }catch(error){if(sequence===routeSequence)$('#main').innerHTML=`<section class="container account-page"><div class="account-card"><h1>Acesso indisponível</h1><p role="alert">${esc(error.message)}</p><a href="/${admin?'admin':'minha-conta'}">Tentar novamente →</a></div></section>`;}
}
function adminIcon(name){const paths={summary:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',products:'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',orders:'M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h4',customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4',categories:'M3 3h7l11 11-7 7L3 10z M7 7h.01',settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'};return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.products}"/></svg>`;}
function adminShell(user,tab,content){
 const pages=[['summary','Visão geral','Acompanhe sua operação e as próximas vendas.'],['products','Produtos','Cadastre peças, organize fotos e controle seu estoque.'],['orders','Pedidos','Acompanhe pagamentos, entregas e atendimento.'],['customers','Clientes','Consulte seus clientes e ajude com o acesso à loja.'],['categories','Categorias','Organize as peças para facilitar a busca na loja.'],['settings','Configurações','Mantenha os dados de atendimento da loja atualizados.']];
 const current=pages.find(p=>p[0]===tab)||pages[0];
 return `<section class="container management-page admin-page"><aside class="admin-sidebar"><div class="admin-sidebar-brand"><strong>STOFFELS<span>GESTÃO DA LOJA</span></strong></div><nav class="management-tabs" aria-label="Administração">${pages.map(([id,label])=>`<a href="/admin?tab=${id}" ${id===tab?'aria-current="page"':''}>${adminIcon(id)}<span>${label}</span></a>`).join('')}</nav><div class="admin-sidebar-footer"><span class="admin-avatar">S</span><div><b>${esc(sellerNames[user.seller_slug]||user.name)}</b><small>${esc(user.email)}</small></div></div></aside><div class="admin-workspace"><header class="admin-heading"><div><span class="eyebrow">PAINEL ADMINISTRATIVO</span><h1>${current[1]}</h1><p>${current[2]}</p></div><div class="button-row"><a class="secondary-button" href="/?loja=${esc(user.seller_slug)}">Minha loja ↗</a><button class="secondary-button" data-logout>Sair</button></div></header><div class="admin-content"><section class="panel seller-link"><strong>Link da sua loja</strong><a href="/?loja=${esc(user.seller_slug)}">${esc(location.origin)}/?loja=${esc(user.seller_slug)}</a><small>Seus pedidos e clientes ficam neste painel. Produtos e estoque são compartilhados.</small></section>${content}</div><p class="admin-version">Stoffels · Administração da loja · Versão 16.10</p></div></section>`;
}

function adminProductForm(p){
 const s=p?.shipping||{},isNew=!p,description=p?new DOMParser().parseFromString(p.details.description||'','text/html').body.textContent:'';
 return `<section class="panel"><div class="panel-heading"><h2>${isNew?'Cadastrar produto':'Editar peça #'+p.id}</h2><a href="/admin?tab=products">← Peças</a></div><form id="admin-product-form"><p class="product-validation-message" role="alert" tabindex="-1" hidden></p><input type="hidden" name="id" value="${p?.id||''}"><fieldset class="admin-form-section"><legend>01 · Informações do produto</legend><div class="form-grid">${field('Nome da peça','name',p?.name,'required minlength="3" maxlength="240"')}${field('Marca','brand',p?.brand,'maxlength="100"')}${field('Modelo / aplicação','model',p?.model,'maxlength="200"')}<label>Categoria<select name="category" required>${categories.map(c=>`<option value="${esc(c.slug)}" ${p?.category===c.slug?'selected':''}>${esc(names[c.slug]||c.name)}</option>`).join('')}</select></label>${field('Preço de venda (R$)','price',p?Number(p.priceCents/100).toFixed(2):'','type="number" required min="0.01" max="1000000" step="0.01"')}${field('Preço anterior (R$)','originalPrice',p?Number(p.originalPriceCents/100).toFixed(2):'','type="number" min="0.01" max="1000000" step="0.01"')}${field('Saldo disponível para novas vendas','stockQuantity',p?.stockQuantity??10,'type="number" required min="0" max="1000000" step="1"')}</div><p class="field-help">O saldo é interno. As unidades reservadas em pedidos já foram descontadas e não aparecem neste campo.</p><div class="check-row"><label><input type="checkbox" name="available" ${p?.published!==false?'checked':''}> Disponível na loja</label><label><input type="checkbox" name="freeShipping" ${p?.shipping?.freeShipping?'checked':''}> Frete grátis para este produto</label><label><input type="checkbox" name="featured" ${p?.catalog.featured?'checked':''}> Destaque na home</label><label><input type="checkbox" name="archived" ${p?.archived?'checked':''}> Arquivada</label></div><label>Descrição e aplicação<textarea name="description" rows="7" maxlength="20000">${esc(description)}</textarea></label></fieldset><fieldset class="admin-form-section"><legend>02 · Fotos do produto</legend><p>A primeira foto será a capa. Você pode enviar arquivos ou organizar uma URL por linha.</p><label>Enviar fotos<input type="file" id="product-photo-files" accept="image/jpeg,image/png,image/webp" multiple></label><p id="photo-upload-message" role="status"></p><button type="button" class="secondary-button" id="recover-uploaded-photos">Recuperar fotos já enviadas</button><div id="recoverable-photos" class="photo-previews"></div><label>Fotos (uma URL por linha)<textarea name="images" id="product-images" rows="5" required>${esc((p?.details.images||[]).join('\n'))}</textarea></label><div class="photo-previews" id="photo-previews">${(p?.details.images||[]).map(url=>`<img src="${esc(imageUrl(url))}" alt="Foto da peça" width="100" height="100">`).join('')}</div></fieldset><fieldset class="admin-form-section"><legend>03 · Embalagem para frete</legend><p>Não sabe as medidas? Deixe os quatro campos vazios para gerar estimativas pelo tipo de peça. Confira a embalagem antes de enviar.</p><div class="form-grid">${field('Peso com embalagem (kg)','weightKg',s.weightGrams?s.weightGrams/1000:'','type="number" min="0.05" max="1000" step="0.001"')}${field('Comprimento (cm)','lengthCm',s.lengthCm,'type="number" min="1" max="500" step="1"')}${field('Largura (cm)','widthCm',s.widthCm,'type="number" min="1" max="500" step="1"')}${field('Altura (cm)','heightCm',s.heightCm,'type="number" min="1" max="500" step="1"')}</div><div class="check-row"><label><input name="estimated" type="checkbox" ${s.estimated?'checked':''}> Peso e medidas ainda estimados</label><label><input name="restricted" type="checkbox" ${s.restricted?'checked':''}> Transporte precisa de conferência manual</label></div></fieldset><div class="admin-save-bar">${formMessage}<a class="secondary-button" href="/admin?tab=products">Cancelar</a><button type="submit" class="primary-button">Salvar produto</button></div></form></section>`;
}
async function adminPage(user,sequence){
 const params=new URLSearchParams(location.search),tab=params.get('tab')||'summary';let content='';
 const editing=tab==='products'&&(params.has('new')||params.has('id'));
 const request=new URLSearchParams(params);request.set('view',editing?'categories':tab);
 const initial=await api('/api/admin?'+request);if(sequence!==routeSequence)return;user=initial.user;
 if(tab==='categories'||editing)categories=initial.categories;

 if(tab==='summary'){
  const {summary:s}=initial;content=`<div class="stats-grid">${[['Peças',s.products],['Clientes',s.customers],['Pedidos',s.orders],['A preparar',s.to_ship],['Recebido',money(s.revenue_cents/100)]].map(([label,value])=>`<div class="panel stat"><span>${label}</span><strong>${value??0}</strong></div>`).join('')}</div><section class="panel"><h2>Próximas ações</h2><div class="button-row"><a class="primary-button admin-create-product" href="/admin?tab=products&new=1"><span aria-hidden="true">＋</span><span>Cadastrar produto</span></a><a class="secondary-button" href="/admin?tab=orders&status=paid">Preparar pedidos pagos</a><a class="secondary-button" href="/admin?tab=products&filter=review">Conferir embalagens</a></div>${s.attention?`<p class="notice">${s.attention} pedido(s) precisam de conferência de pagamento ou geração do link. Abra Pedidos para acompanhar.</p>`:''}${s.unknown_stock?`<p class="notice">${s.unknown_stock} peça(s) ainda precisam de saldo de estoque.</p>`:''}<p>O pagamento é confirmado pelo servidor. A compra de etiquetas e a postagem são feitas manualmente pela loja.</p></section>`;
 }else if(tab==='products'){
  if(params.has('new')||params.has('id')){const p=params.has('id')?(await api('/api/admin?view=products&id='+encodeURIComponent(params.get('id')))).product:null;content=(params.get('saved')==='1'&&p?`<div class="product-saved-notice" role="status"><strong>Produto #${p.id} salvo no estoque.</strong><a href="/admin?tab=products&q=${p.id}">Ver produto na lista de estoque →</a></div>`:'')+adminProductForm(p);}
  else{const data=initial;content=`<section class="panel"><div class="panel-heading"><h2>Peças (${data.total})</h2><a class="primary-button admin-create-product" href="/admin?tab=products&new=1"><span aria-hidden="true">＋</span><span>Cadastrar produto</span></a></div><form id="admin-search" class="admin-search"><input type="hidden" name="tab" value="products"><input name="q" placeholder="Nome ou código" value="${esc(params.get('q')||'')}"><select name="filter"><option value="">Todas</option>${[['available','Disponíveis'],['unavailable','Indisponíveis'],['archived','Arquivadas'],['review','Conferir embalagem']].map(([v,l])=>`<option value="${v}" ${params.get('filter')===v?'selected':''}>${l}</option>`).join('')}</select><button class="secondary-button">Buscar</button></form><div class="admin-products">${data.products.map(p=>`<article class="admin-product"><img src="${esc(imageUrl(p.image||placeholder))}" alt="" width="70" height="70" loading="lazy" decoding="async"><div><b>${esc(p.name)}</b><small>#${p.id} · ${money(p.priceCents/100)} · Estoque interno: ${p.stockQuantity??'a conferir'}</small><span class="admin-availability">${p.archived?'Arquivada':p.available?'Disponível':'Indisponível'}</span></div><div class="button-row"><a class="secondary-button" href="/admin?tab=products&id=${p.id}">Editar</a>${!p.archived?`<button class="text-button" data-archive-product="${p.id}">Arquivar</button>`:''}</div></article>`).join('')}</div><nav class="pagination">${data.page>1?`<a class="secondary-button" href="/admin?${new URLSearchParams({...Object.fromEntries(params),page:data.page-1})}">← Anterior</a>`:''}<span>Página ${data.page}</span>${data.page*20<data.total?`<a class="secondary-button" href="/admin?${new URLSearchParams({...Object.fromEntries(params),page:data.page+1})}">Próxima →</a>`:''}</nav></section>`;}
 }else if(tab==='orders'){
  const data=initial;
  if(data.order){const o=data.order;content=orderMarkup(o,true)+`<section class="panel"><h2>Gestão do pedido</h2><form id="admin-order-form" data-order="${o.id}"><label>Situação da entrega<select name="fulfillmentStatus">${['awaiting_payment','processing','shipped','delivered'].map(v=>`<option value="${v}" ${o.fulfillmentStatus===v?'selected':''}>${statusLabel(v)}</option>`).join('')}</select></label>${field('Código de rastreio','trackingCode',o.trackingCode,'maxlength="100"')}${field('Link de rastreio','trackingUrl',o.trackingUrl,'type="url" maxlength="1000"')}<label>Observação interna<textarea name="adminNote" rows="3" maxlength="4000">${esc(o.adminNote||'')}</textarea></label>${formMessage}<button class="primary-button">Salvar acompanhamento</button></form>${o.status!=='paid'&&o.status!=='cancelled'?`<button class="text-button" data-cancel-order="${o.id}">Cancelar pedido</button><p class="field-help">Se já existe um link de pagamento, a reserva de estoque é mantida. Desative o link pela InfinitePay antes de ajustar esse saldo manualmente.</p>`:''}<details><summary>Conferência de pagamento</summary><form id="admin-verify-form" data-order="${o.id}">${field('Código da fatura (slug)','slug',o.invoiceSlug,'required maxlength="150"')}${field('Transação InfinitePay (NSU)','transactionNsu',o.transactionNsu,'required maxlength="100"')}${formMessage}<button class="secondary-button">Consultar InfinitePay</button></form><p>Estornos são feitos diretamente no aplicativo da InfinitePay. O painel não marca pagamentos como aprovados manualmente.</p></details>${o.checkoutState==='uncertain'?`<details><summary>Recuperar link já criado</summary><p>Confira na InfinitePay se o link pertence a este pedido antes de colá-lo aqui.</p><form id="admin-recover-form" data-order="${o.id}">${field('Link de checkout da InfinitePay','url','','type="url" required')}${field('Slug da fatura (opcional)','slug','','maxlength="150"')}${formMessage}<button class="secondary-button">Salvar link conferido</button></form></details>`:''}</section>`;}
  else content=`<section class="panel"><h2>Pedidos</h2><form id="admin-search" class="admin-search"><input type="hidden" name="tab" value="orders"><input name="q" placeholder="Nome, e-mail ou pedido" value="${esc(params.get('q')||'')}"><select name="status"><option value="">Todos os pagamentos</option>${['pending','checkout_created','paid','cancelled','failed'].map(v=>`<option value="${v}" ${params.get('status')===v?'selected':''}>${statusLabel(v)}</option>`).join('')}</select><button class="secondary-button">Buscar</button></form>${orderList(data.orders,true)}</section>`;
 }else if(tab==='customers'){
  const data=initial;content=`<section class="panel"><h2>Clientes</h2><form id="admin-search" class="admin-search"><input type="hidden" name="tab" value="customers"><input name="q" placeholder="Nome ou e-mail" value="${esc(params.get('q')||'')}"><button class="secondary-button">Buscar</button></form>${data.customers.map(c=>`<div class="customer-row"><b>${esc(c.name)}</b><span>${esc(c.email)}</span><span>${esc(c.phone||'Telefone não informado')}</span><small>${c.order_count} pedido(s) · Cadastro: ${dateLabel(c.created_at)}</small><button class="text-button" data-recover-user="${c.id}">Gerar link de recuperação de acesso</button></div>`).join('')||'<p>Nenhum cliente encontrado.</p>'}</section>`;
 }else if(tab==='categories')content=`<section class="panel"><h2>Categorias</h2><form id="category-form"><div class="form-grid">${field('Nome da categoria','name','','required minlength="2" maxlength="100"')}${field('Identificador (ex.: freios/pastilhas)','slug','','required pattern="[a-z0-9/-]+" maxlength="180"')}</div>${formMessage}<button class="primary-button">Salvar categoria</button></form><div class="category-management">${categories.map(c=>`<p><b>${esc(c.name)}</b><small>${esc(c.slug)}</small></p>`).join('')}</div></section>`;
 else if(tab==='settings'){
  const {settings:s}=initial;content=`<section class="panel"><h2>Dados da loja</h2><form id="store-settings-form"><div class="form-grid">${field('Nome da loja','name',s.name,'required maxlength="100"')}${field('Razão social','legalName',s.legalName,'maxlength="180"')}${field('CNPJ','cnpj',s.cnpj,'maxlength="30"')}${field('WhatsApp com DDD','phone',s.phone,'type="tel" required')}${field('E-mail de atendimento','email',s.email,'type="email"')}${field('Endereço da loja','address',s.address,'required maxlength="300"')}${field('Dias úteis de preparação antes do transporte','dispatchDays',s.dispatchDays,'type="number" required min="0" max="30" step="1"')}</div>${formMessage}<button class="primary-button">Salvar dados</button></form><h3>Pagamentos e entrega</h3><p>InfinitePay: Pix e cartão de crédito. Melhor Envio: apenas cotação. A loja compra a etiqueta e realiza a postagem por conta própria.</p></section>`;
 }else throw new Error('Página administrativa não encontrada.');
 if(sequence===routeSequence)$('#main').innerHTML=adminShell(user,tab,content);
}
async function checkoutPage(sequence){
 const {user}=await accountApi();if(sequence!==routeSequence)return;
 if(!user){go('/minha-conta?cadastro=1&next='+encodeURIComponent('/checkout'));return;}
 if(!cart.length){$('#main').innerHTML='<section class="container empty"><h1>Seu carrinho está vazio</h1><a href="/catalogo" class="primary-button">Ver catálogo</a></section>';return;}
 const profile=await api('/api/customer');if(sequence!==routeSequence)return;checkoutCustomer=profile;
 $('#cart-content').innerHTML='';
 $('#main').innerHTML=`<section class="container management-page"><div class="panel-heading"><div><span class="eyebrow">FINALIZAR COMPRA</span><h1>Entrega e pagamento</h1><p>Confira os dados e escolha o frete antes de continuar.</p></div><a href="/catalogo">Continuar comprando →</a></div><div class="checkout-layout"><section class="panel"><h2>Dados para entrega</h2>${profile.addresses.length?`<label>Usar endereço salvo<select id="checkout-saved-address"><option value="">Preencher endereço</option>${profile.addresses.map(a=>`<option value="${a.id}">${esc(a.label)} · ${esc(a.address.street)}</option>`).join('')}</select></label>`:''}<form id="checkout-form">${addressFields({receiver:user.name,cep:shippingPostalCode})}${field('Telefone com DDD','phone',profile.user.phone,'type="tel" autocomplete="tel-national" required')}<p>E-mail da conta: ${esc(user.email)}</p><label class="check-label"><input type="checkbox" name="saveAddress" ${profile.addresses.length?'':'checked'}> Salvar este endereço na minha conta</label><label class="check-label"><input type="checkbox" required> Conferi as peças, a aplicação no veículo e o endereço de entrega. Li as <a href="/trocas">condições de troca</a> e a <a href="/privacidade">política de privacidade</a>.</label>${formMessage}<button class="primary-button" id="pay-order" ${selectedShippingService?'':'disabled'}>Ir para pagamento seguro</button><p class="field-help">Você será direcionado à InfinitePay para pagar com Pix ou cartão. Seus dados de cartão não passam pela Stoffels.</p></form></section><section class="panel"><h2>Resumo da compra</h2><div id="checkout-cart"></div></section></div></section>`;cartContent();if(shippingPostalCode.replace(/\D/g,'').length===8)lookupAddress($('#checkout-form'));
}
async function purchasePage(sequence){
 const params=new URLSearchParams(location.search),id=location.pathname.startsWith('/pedido/')?location.pathname.split('/')[2]:params.get('order_id')||params.get('order_nsu');
 const {user}=await accountApi();if(sequence!==routeSequence)return;
 if(!user){go('/minha-conta?next='+encodeURIComponent(location.pathname+location.search));return;}
 if(!id)throw new Error('Pedido não informado.');
 let notice='';
 if(params.get('transaction_nsu')&&params.get('slug')){
  try{const verification=await api('/api/orders',{action:'verify',id,transactionNsu:params.get('transaction_nsu'),slug:params.get('slug')});if(!verification.paid)notice='O pagamento ainda está sendo confirmado. Aguarde a atualização do pedido.';}
  catch(error){notice=error.message;}
 }
 const {order}=await api('/api/orders?id='+encodeURIComponent(id));if(sequence!==routeSequence)return;
 if(order.status==='paid'){
  try{const record=JSON.parse(localStorage.getItem('stoffels-purchase-'+id)||'null');if(record&&!record.cleared){if(record.cartKey===cartKey()){cart=[];saveCart();}record.cleared=true;localStorage.setItem('stoffels-purchase-'+id,JSON.stringify(record));}}catch{}
 }
 $('#main').innerHTML=`<section class="container management-page">${notice?`<p class="notice" role="status">${esc(notice)}</p>`:''}${orderMarkup(order)}<div class="button-row"><button class="secondary-button" id="refresh-purchase">Atualizar pedido</button><a class="secondary-button" href="https://wa.me/55${storeInfo.phone}?text=${encodeURIComponent('Olá! Preciso de ajuda com o pedido '+order.id)}" target="_blank" rel="noopener noreferrer">Falar com a loja</a></div></section>`;
}
function legalPage(slug){
 const contact=`<p>Stoffels Autopeças · CNPJ ${esc(storeInfo.cnpj)}<br>${esc(storeInfo.address)}</p><p>Atendimento pelo <a href="https://wa.me/55${storeInfo.phone}" target="_blank" rel="noopener noreferrer">WhatsApp ${esc(storeInfo.phone)}</a>${storeInfo.email?' ou '+esc(storeInfo.email):''}.</p>`;
 if(slug==='privacidade')return `<section class="container management-page"><article class="panel legal"><h1>Privacidade</h1><p>Usamos nome, e-mail, telefone e endereço para identificar sua conta, processar a compra, entregar os produtos e prestar atendimento. Guardamos o histórico dos pedidos e das conversas sobre eles.</p><p>Os dados necessários ao pagamento são enviados à InfinitePay. O cálculo de frete envia ao Melhor Envio os CEPs, valores e informações das embalagens. Os dados de cartão são preenchidos diretamente na InfinitePay e não são armazenados pela Stoffels.</p><p>Utilizamos um cookie de sessão para manter seu acesso e o armazenamento local do navegador para lembrar o carrinho. Não há cookies publicitários implementados neste sistema.</p><p>Você pode pedir acesso, correção ou exclusão de dados pelo atendimento. Informações cuja guarda seja necessária para cumprir obrigações ou exercer direitos podem ser conservadas pelo prazo aplicável.</p>${contact}</article></section>`;
 return `<section class="container management-page"><article class="panel legal"><h1>Trocas, devoluções e atendimento</h1><p>Confira o código, a aplicação, as fotos e o estado da peça antes da compra. As peças são originais e seminovas; os detalhes do anúncio fazem parte da descrição do produto.</p><p>Para solicitar cancelamento, troca, devolução ou atendimento de garantia, abra o pedido em Minha conta e envie uma mensagem ou fale pelo WhatsApp, informando o número do pedido e o motivo. Não envie a peça de volta sem combinar as instruções de devolução.</p><p>As solicitações são atendidas conforme os direitos aplicáveis ao consumidor. O prazo de arrependimento para compras online é de 7 dias a partir do recebimento. Os produtos têm garantia de 90 dias, observadas as condições legais. Consulte o <a href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" target="_blank" rel="noopener noreferrer">Código de Defesa do Consumidor</a>.</p><p>O valor do frete é mostrado antes do pagamento. O prazo da transportadora é contado após a postagem; acompanhe a preparação e o rastreio na página do pedido. Quando o transporte exigir condições especiais, a cotação online poderá ficar indisponível.</p>${contact}</article></section>`;
}
async function reloadStoreCatalog(){catalogReady=false;catalogRevision=Date.now();}
function showProductError(form,text){const message=form.querySelector('.product-validation-message');if(message){message.hidden=false;message.textContent=text;message.scrollIntoView?.({block:'center'});}}
document.addEventListener('invalid',event=>{const form=event.target.closest('#admin-product-form');if(!form)return;const invalid=[...form.elements].filter(e=>e.willValidate&&!e.validity.valid);const labels=invalid.map(e=>e.closest('label')?.firstChild?.textContent?.trim()||e.name);showProductError(form,'O produto ainda não foi salvo. Confira: '+[...new Set(labels)].join(', ')+'.');},true);
async function submitManaged(form,work){const button=form.querySelector('button[type="submit"],button:not([type])'),message=form.querySelector('.form-message');if(button)button.disabled=true;if(message)message.textContent='Salvando…';try{await work();}catch(error){if(form.getAttribute('id')==='admin-product-form')showProductError(form,error.message);if(message)message.textContent=error.message;else toast(error.message);}finally{if(button)button.disabled=false;}}
document.addEventListener('submit',event=>{
 const form=event.target,data=Object.fromEntries(new FormData(form));
 const ids=['profile-form','address-form','admin-product-form','admin-order-form','admin-verify-form','admin-recover-form','category-form','store-settings-form','order-message-form','checkout-form','admin-search'];if(!ids.includes(form.getAttribute('id')))return;event.preventDefault();
 if(form.getAttribute('id')==='admin-search'){go('/admin?'+new URLSearchParams(data));return;}
 submitManaged(form,async()=>{
  if(form.getAttribute('id')==='profile-form'){await api('/api/customer',{action:'profile',...data});await renderRoute();}
  if(form.getAttribute('id')==='address-form'){await api('/api/customer',{action:'address',...(data.id?{id:data.id}:{}),label:data.label,address:data});await renderRoute();}
  if(form.getAttribute('id')==='category-form'){await api('/api/admin',{action:'category',...data});await reloadStoreCatalog();await renderRoute();}
  if(form.getAttribute('id')==='store-settings-form'){await api('/api/admin',{action:'settings',settings:{...data,dispatchDays:Number(data.dispatchDays)}});await loadStoreInfo();form.querySelector('.form-message').textContent='Dados da loja salvos.';}
  if(form.getAttribute('id')==='admin-product-form'){
   const measurements=['weightKg','lengthCm','widthCm','heightCm'].map(k=>data[k]?.trim());
   if(measurements.some(Boolean)&&!measurements.every(Boolean))throw new Error('Preencha peso, comprimento, largura e altura, ou deixe os quatro vazios para estimar.');
   if(data.originalPrice&&Number(data.originalPrice)<Number(data.price))throw new Error('O preço anterior deve ser maior ou igual ao preço de venda. Você também pode deixá-lo vazio.');
   const product={...(data.id?{id:Number(data.id)}:{}),name:data.name,brand:data.brand,model:data.model,category:data.category,priceCents:Math.round(Number(data.price)*100),originalPriceCents:Math.round(Number(data.originalPrice||data.price)*100),stockQuantity:Number(data.stockQuantity),description:data.description,available:form.elements.available.checked,freeShipping:form.elements.freeShipping.checked,featured:form.elements.featured.checked,archived:form.elements.archived.checked,images:data.images.split('\n').map(x=>x.trim()).filter(Boolean),shipping:measurements.every(Boolean)?{weightGrams:Math.round(Number(data.weightKg)*1000),lengthCm:Number(data.lengthCm),widthCm:Number(data.widthCm),heightCm:Number(data.heightCm),estimated:form.elements.estimated.checked,restricted:form.elements.restricted.checked}:undefined};
   if(!product.shipping&&form.elements.restricted.checked)throw new Error('Para transporte com conferência manual, informe o peso e as medidas.');
   const result=await api('/api/admin',{action:'product',product});await reloadStoreCatalog();go('/admin?tab=products&id='+result.id+'&saved=1');toast('Produto salvo no estoque');
  }
  if(form.getAttribute('id')==='admin-order-form'){await api('/api/admin',{action:'order',id:form.dataset.order,...data});await renderRoute();toast('Acompanhamento atualizado');}
  if(form.getAttribute('id')==='admin-verify-form'){const result=await api('/api/admin',{action:'verify-payment',id:form.dataset.order,...data});if(!result.paid)throw new Error('A InfinitePay ainda não confirmou esse pagamento.');await renderRoute();}
  if(form.getAttribute('id')==='admin-recover-form'){await api('/api/admin',{action:'recover-checkout',id:form.dataset.order,...data});await renderRoute();}
  if(form.getAttribute('id')==='order-message-form'){await api(form.dataset.admin==='true'?'/api/admin':'/api/orders',{action:'message',id:form.dataset.order,message:data.message});await renderRoute();}
  if(form.getAttribute('id')==='checkout-form'){
   if(checkoutSubmitting)return;
   if(!selectedShippingService||!shippingQuote||new Date(shippingQuote.expiresAt)<=new Date()||quotedCartKey!==cartKey())throw new Error('Calcule e selecione o frete novamente.');
   if(String(data.cep).replace(/\D/g,'')!==shippingPostalCode.replace(/\D/g,''))throw new Error('O CEP do endereço deve ser igual ao CEP usado no frete.');
   checkoutSubmitting=true;
   try{
    const signature=JSON.stringify({cart:cartKey(),address:data,quote:shippingQuote.quoteId,service:selectedShippingService.serviceId});let attempt;
    try{attempt=JSON.parse(sessionStorage.getItem('stoffels-checkout-attempt')||'null');}catch{}
    if(!attempt||attempt.signature!==signature){attempt={key:crypto.randomUUID(),signature};sessionStorage.setItem('stoffels-checkout-attempt',JSON.stringify(attempt));}
    const purchaseCartKey=cartKey();
    const result=await api('/api/checkout',{clientKey:attempt.key,items:cart.map(x=>({id:x.id,quantity:x.quantity})),address:data,phone:data.phone,quoteId:shippingQuote.quoteId,serviceId:selectedShippingService.serviceId});
    try{localStorage.setItem('stoffels-purchase-'+result.id,JSON.stringify({cartKey:purchaseCartKey,cleared:false}));}catch{}
    if(form.elements.saveAddress.checked&&checkoutCustomer.addresses.length<10){try{await api('/api/customer',{action:'address',label:'Entrega',address:data});}catch{}}
    if(result.url){window.location.assign(result.url);}else go('/pedido/'+result.id);
   }finally{checkoutSubmitting=false;}
  }
 });
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 try{
  if(button.id==='recover-uploaded-photos'){
   button.disabled=true;try{const data=await api('/api/admin?view=uploads');$('#recoverable-photos').innerHTML=data.uploads.map(photo=>`<button type="button" class="recover-photo" data-use-photo="${esc(photo.url)}"><img src="${esc(photo.url)}" alt="Foto enviada em ${esc(dateLabel(photo.createdAt))}" width="90" height="90"><span>Usar esta foto</span></button>`).join('')||'<p>Nenhuma foto sem produto encontrada.</p>';}finally{button.disabled=false;}
  }
  if(button.dataset.usePhoto){const target=$('#product-images'),url=button.dataset.usePhoto;if(!target.value.split('\n').includes(url))target.value+=(target.value.trim()?'\n':'')+url;updatePhotoPreviews();button.disabled=true;button.querySelector('span').textContent='Foto selecionada';}
  if(button.id==='go-checkout'){$('#cart-dialog').close();go('/checkout');}
  if(button.id==='refresh-purchase')await renderRoute();
  if(button.dataset.recoverUser){
   const result=await api('/api/admin',{action:'recover-user',id:button.dataset.recoverUser});
   $('#dialog-content').innerHTML=`<h2>Recuperação de acesso</h2><p>Link válido por 1 hora e para um único uso. Confirme a identidade do cliente antes de compartilhar.</p><p><a href="${esc(result.url)}" target="_blank" rel="noopener noreferrer">${esc(result.url)}</a></p>`;$('#info-dialog').showModal();
  }
  if(button.dataset.editAddress){
   const entry=accountAddresses.find(x=>x.id===button.dataset.editAddress);if(entry){const form=$('#address-form');cancelAddressLookup(form);for(const [key,value]of Object.entries({...entry.address,id:entry.id,label:entry.label}))if(form.elements[key])form.elements[key].value=value;form.closest('details').open=true;form.elements.receiver.focus();}
  }
  if(button.dataset.deleteAddress){if(!confirm('Remover este endereço salvo?'))return;await api('/api/customer',{action:'delete-address',id:button.dataset.deleteAddress});await renderRoute();}
  if(button.dataset.archiveProduct){if(!confirm('Arquivar esta peça e retirá-la da vitrine? Os pedidos anteriores serão preservados.'))return;await api('/api/admin',{action:'archive',id:Number(button.dataset.archiveProduct)});await reloadStoreCatalog();await renderRoute();}
  if(button.dataset.cancelOrder){if(!confirm('Cancelar este pedido? Se existir link de pagamento, a reserva de estoque será mantida até conferência na InfinitePay.'))return;await api('/api/admin',{action:'cancel',id:button.dataset.cancelOrder});await renderRoute();}
 }catch(error){toast(error.message);}
});
document.addEventListener('change',async event=>{
 if(event.target.id==='checkout-saved-address'){
  const entry=checkoutCustomer?.addresses.find(x=>x.id===event.target.value);if(!entry)return;
  const form=$('#checkout-form');cancelAddressLookup(form);for(const [key,value]of Object.entries(entry.address))if(form.elements[key])form.elements[key].value=value;
  shippingPostalCode=entry.address.cep;shippingQuote=null;selectedShippingService=null;cartContent();
 }
 if(event.target.id==='product-photo-files'){
  const input=event.target,message=$('#photo-upload-message'),form=$('#admin-product-form'),save=form.querySelector('button[type=submit]');input.disabled=true;if(save)save.disabled=true;
  try{for(const file of input.files){if(file.size>4*1024*1024)throw new Error('Cada imagem deve ter até 4 MB.');message.textContent='Enviando '+file.name+'…';const response=await fetch('/api/image',{method:'POST',headers:{'Content-Type':file.type},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error);const target=$('#product-images');target.value+=(target.value.trim()?'\n':'')+result.url;}updatePhotoPreviews();message.textContent='Fotos enviadas. Salve a peça para publicar.';}catch(error){message.textContent=error.message;}finally{input.disabled=false;if(save)save.disabled=false;input.value='';}
 }
});
function updatePhotoPreviews(){const target=$('#product-images'),preview=$('#photo-previews');if(target&&preview)preview.innerHTML=target.value.split('\n').map(x=>x.trim()).filter(x=>x.startsWith('/api/image?')||x.startsWith('/images/')||x.startsWith('https://')).map(url=>`<img src="${esc(imageUrl(url))}" alt="Foto da peça" width="100" height="100">`).join('');}
document.addEventListener('input',event=>{
 if(event.target.id==='product-images')updatePhotoPreviews();
 if(event.target.closest('#checkout-form')&&event.target.name==='cep'){
  shippingPostalCode=event.target.value;if(shippingQuote){shippingQuote=null;selectedShippingService=null;}cartContent();
 }
});
async function loadStoreInfo(){try{const result=await api('/api/store');storeInfo={...storeInfo,...result.settings};const footer=$('.footer-bottom');if(footer)footer.innerHTML=`© ${new Date().getFullYear()} ${esc(storeInfo.name)} · CNPJ ${esc(storeInfo.cnpj)}<br>${esc(storeInfo.address)}<br><a href="/trocas">Trocas e devoluções</a> · <a href="/privacidade">Privacidade</a> · <a href="https://wa.me/55${storeInfo.phone}" target="_blank" rel="noopener noreferrer">Atendimento</a>`;}catch{}}

let catalogReady=false,catalogLoading=null,catalogRevision=0;
async function ensureCatalog(){
 if(catalogReady)return;
 if(catalogLoading)return catalogLoading;
 catalogLoading=(async()=>{
  let imported;
  if(window.STOFFELS_CONFIG?.databaseApi)imported=await api('/api/catalog'+(catalogRevision?'?revision='+catalogRevision:''));
  else {const [p,c]=await Promise.all([api('/data/catalog.json'),api('/data/categories.json')]);imported={products:p,categories:c};}
  products=imported.products;categories=imported.categories;
  bySlug=new Map(products.map(p=>[p.slug,p]));byId=new Map(products.map(p=>[p.id,p]));
  $('#category-menu').innerHTML='<b>Linhas de peças</b>'+categories.filter(c=>!c.slug.includes('/')).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<a href="/${esc(c.slug)}">${esc(names[c.slug]||c.name)} <span>›</span></a>`).join('')+'<a class="all-catalog" href="/catalogo">Ver todo o catálogo →</a>';
  cart=cart.filter(x=>byId.has(x.id));saveCart();catalogReady=true;
 })();
 try{await catalogLoading;}finally{catalogLoading=null;}
}
async function boot(){loadStoreInfo();await renderRoute();}
// Cada formulário controla sua própria consulta para descartar respostas de CEPs anteriores.
const addressLookups=new WeakMap();
function cancelAddressLookup(form){const previous=addressLookups.get(form);if(previous){clearTimeout(previous.timer);previous.controller?.abort();}addressLookups.delete(form);const message=form.querySelector('.cep-feedback');if(message)message.textContent='';}
function scheduleAddressLookup(form){
 const previous=addressLookups.get(form);cancelAddressLookup(form);
 if(previous?.filled)for(const [name,value]of Object.entries(previous.filled)){if(form.elements[name].value===value)form.elements[name].value='';}
 const cep=form.elements.cep.value.replace(/\D/g,'');if(cep.length!==8)return;
 const state={timer:setTimeout(()=>lookupAddress(form),300)};addressLookups.set(form,state);
}
async function lookupAddress(form){
 if(!form?.isConnected)return;const cep=form.elements.cep.value.replace(/\D/g,'');if(cep.length!==8)return;
 cancelAddressLookup(form);const controller=new AbortController(),state={controller,filled:{}};addressLookups.set(form,state);
 const fields=['street','neighborhood','city','state'],before=Object.fromEntries(fields.map(name=>[name,form.elements[name].value]));
 const message=form.querySelector('.cep-feedback');if(message)message.textContent='Buscando endereço…';
 const timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch('/api/cep?cep='+cep,{signal:controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível consultar o CEP. Preencha o endereço manualmente.');
  if(!form.isConnected||addressLookups.get(form)!==state||form.elements.cep.value.replace(/\D/g,'')!==cep)return;
  for(const name of fields){if(form.elements[name].value===before[name]&&result[name]){form.elements[name].value=result[name];state.filled[name]=result[name];}}
  if(message)message.textContent=result.street&&result.neighborhood?'Endereço preenchido. Confira os dados e informe o número.':'Cidade e estado preenchidos. Complete rua, bairro e número.';
 }catch(error){if(form.isConnected&&addressLookups.get(form)===state&&message)message.textContent=error.name==='AbortError'?'A consulta demorou. Preencha o endereço manualmente.':error.message;}finally{clearTimeout(timeout);}
}
document.addEventListener('input',event=>{if(event.target.name==='cep'){const form=event.target.closest('#checkout-form,#address-form');if(form)scheduleAddressLookup(form);}});

boot();

const sellerBar=document.createElement('div');sellerBar.className='seller-bar';sellerBar.innerHTML=activeSeller?`Atendimento: <strong>${sellerNames[activeSeller]}</strong>`:'Escolha seu atendimento: <a href="/?loja=thiago">Thiago</a> <a href="/?loja=vitor">Vitor</a>';document.body.prepend(sellerBar);
