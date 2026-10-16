import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const load=name=>readFile(new URL('../public/'+name,import.meta.url),'utf8');
const catalog=JSON.parse(await load('data/catalog.json'));const product=catalog.find(x=>x.available);
const dom=new JSDOM(await load('index.html'),{url:'http://localhost:3001',runScripts:'outside-only',pretendToBeVisual:true});
dom.window.scrollTo=()=>{};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
dom.window.localStorage.setItem('stoffels-cart-v1',JSON.stringify([{id:product.id,quantity:1}]));
let requestBody,fail=false,free=false;
dom.window.fetch=async(url,options)=>{
 if(url==='/api/shipping'){
  requestBody=JSON.parse(options.body);
  return {ok:!fail,json:async()=>fail?{error:'Sem serviço disponível'}:{quoteId:'test-quote',expiresAt:new Date(Date.now()+60000).toISOString(),estimated:true,options:free?[{serviceId:'free-no-quote',carrier:'Stoffels',name:'Frete grátis',priceCents:0,deliveryDays:null,freeFallback:true}]:[{serviceId:'1',carrier:'Transportadora',name:'Entrega',priceCents:2590,deliveryDays:5}]}};
 }
 if(String(url).includes('catalog.json'))return {ok:true,json:async()=>[product]};
 if(String(url).includes('categories.json'))return {ok:true,json:async()=>[]};
 return {ok:false};
};
const waitFor=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Estado esperado não encontrado');};
dom.window.eval(await load('assets/app.js'));const doc=dom.window.document;
await waitFor(()=>doc.querySelector('.showcase .product-card'));
doc.querySelector('#cart-toggle').click();assert.match(doc.querySelector('#cart-content').textContent,/A calcular/);assert.doesNotMatch(doc.querySelector('#cart-content').textContent,/Grátis/);
const submit=()=>{doc.querySelector('#shipping-cep').value='01001-000';doc.querySelector('#shipping-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));};
submit();await waitFor(()=>doc.querySelector('[name="shipping-service"]'));
assert.deepEqual(requestBody.items,[{id:product.id,quantity:1}]);assert.equal('priceCents' in requestBody,false);
doc.querySelector('[name="shipping-service"]').click();
const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
assert.equal(doc.querySelector('#cart-content .cart-total:last-of-type strong')?.textContent||doc.querySelectorAll('#cart-content .cart-total strong')[2].textContent,money(product.price+25.9));
assert.match(doc.querySelector('#cart-content').textContent,/embalagem estimados/);
doc.querySelector('[data-delta="1"]').click();assert.equal(doc.querySelector('[name="shipping-service"]'),null);assert.match(doc.querySelector('#cart-content').textContent,/A calcular/);
free=true;submit();await waitFor(()=>doc.querySelector('[name="shipping-service"]:checked'));
assert.equal(doc.querySelectorAll('#cart-content .cart-total strong')[1].textContent,'Grátis');
assert.equal(doc.querySelectorAll('#cart-content .cart-total strong')[2].textContent,money(product.price*2));
assert.match(doc.querySelector('#cart-content').textContent,/Transporte e prazo combinados com a Stoffels/);
assert.doesNotMatch(doc.querySelector('#cart-content').textContent,/null dia|undefined dia/);
fail=true;submit();await waitFor(()=>doc.querySelector('#shipping-message')?.textContent==='Sem serviço disponível');assert.equal(doc.querySelector('[name="shipping-service"]'),null);
dom.window.close();console.log('Interface de frete: CEP, consulta, seleção, total, mudança do carrinho e indisponibilidade verificados.');
