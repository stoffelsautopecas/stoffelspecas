import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { JSDOM } from 'jsdom';
const load=name=>readFile(new URL('../public/'+name,import.meta.url),'utf8');
const catalog=JSON.parse(await load('data/catalog.json')),p=catalog.find(x=>x.available&&x.name.toLowerCase().includes('maçaneta'));
const html=await load('index.html'),js=await load('assets/app.js');
const waitFor=async condition=>{for(let i=0;i<200;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Interface esperada não encontrada');};
let user={id:randomUUID(),name:'Cliente teste',email:'test@example.invalid',role:'admin'},savedProduct;
const order={id:randomUUID(),status:'paid',checkoutState:'ready',subtotalCents:19900,shippingCents:2500,totalCents:22400,shipping:{carrier:'Transportadora',name:'Entrega',deliveryDays:5},address:{receiver:'Cliente teste',cep:'97950000',street:'Rua Comandai',number:'1287',neighborhood:'Centro',city:'Guarani das Missões',state:'RS'},customerName:'Cliente teste',customerEmail:user.email,customerPhone:'55996712043',createdAt:new Date().toISOString(),fulfillmentStatus:'processing',items:[{productId:Number(p.id),name:p.name,quantity:1,unitPriceCents:19900}],messages:[]};
const requests=[];
function makeDOM(path){
 const dom=new JSDOM(html,{url:'http://localhost:3001'+path,runScripts:'outside-only',pretendToBeVisual:true});dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;Object.defineProperty(dom.window.crypto,'randomUUID',{value:randomUUID});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 if(path.startsWith('/admin'))dom.window.STOFFELS_CONFIG={databaseApi:true};
 dom.window.localStorage.setItem('stoffels-cart-v1',JSON.stringify([{id:p.id,quantity:1}]));
 dom.window.fetch=async(url,options={})=>{
  if(path.startsWith('/admin')&&String(url).startsWith('/api/catalog'))throw new Error('Admin não deve carregar catálogo completo');
  const parsed=new URL(url,'http://localhost:3001'),body=options.body&&JSON.parse(options.body);if(body)requests.push({path:parsed.pathname,body});let data;
  if(parsed.pathname==='/api/store')data={settings:{name:'Stoffels',cnpj:'04.966.153/0001-49',phone:'55996712043',address:'Loja'}};
  else if(parsed.pathname==='/api/auth'){if(path.startsWith('/admin'))throw new Error('Admin não deve duplicar consulta de autenticação');data={user};}
  else if(parsed.pathname==='/api/customer'){data={user:{...user,phone:'55996712043'},addresses:[]};}
  else if(parsed.pathname==='/api/orders'){if(body?.action==='verify')data={paid:order.status==='paid'};else data=parsed.searchParams.has('id')?{order}:{orders:[{...order,totalCents:order.totalCents}]};}
  else if(parsed.pathname==='/api/checkout'){data={id:order.id,url:null,status:'pending'};}
  else if(parsed.pathname==='/api/shipping')data={quoteId:randomUUID(),expiresAt:new Date(Date.now()+60000).toISOString(),estimated:true,options:[{serviceId:'1',carrier:'Transportadora',name:'Entrega',priceCents:2500,deliveryDays:5}]};
  else if(parsed.pathname==='/api/admin'){
   const view=parsed.searchParams.get('view');
   if(view==='categories')data={categories:[{slug:p.category,name:'Categoria',count:1}]};
   else if(body?.action==='product'){savedProduct={...body.product,id:12345,catalog:{...p,featured:false},details:{images:body.product.images,description:'Descrição salva'}};data={id:12345};}
   else if(body?.action==='order'){order.fulfillmentStatus=body.fulfillmentStatus;order.trackingCode=body.trackingCode;data={ok:true};}
   else if(view==='products')data=parsed.searchParams.has('id')?{product:savedProduct}:{products:[],total:0,page:1};
   else if(view==='orders')data=parsed.searchParams.has('id')?{order}:{orders:[order]};
   else if(view==='settings')data={settings:{name:'Stoffels',phone:'55996712043',cnpj:'04.966.153/0001-49',address:'Loja',dispatchDays:0}};
   else if(view==='customers')data={customers:[]};
   else data={summary:{products:7963,customers:1,orders:1,to_ship:1,revenue_cents:22400,attention:0,unknown_stock:0}};
   data.user=user;
  }else if(parsed.pathname==='/api/catalog'||parsed.pathname==='/data/catalog.json')data=parsed.pathname.startsWith('/api/')?{products:[p],categories:[{slug:p.category,name:'Categoria',count:1}]}:[p];
  else if(parsed.pathname==='/data/categories.json')data=[{slug:p.category,name:'Categoria',count:1}];
  else return {ok:false,json:async()=>({error:'Não encontrado'})};
  return {ok:true,json:async()=>data};
 };
 dom.window.eval(js);return dom;
}
const admin=makeDOM('/admin');const doc=admin.window.document;
await waitFor(()=>doc.querySelector('.stats-grid'));
doc.querySelector('a[href="/admin?tab=products&new=1"]').click();await waitFor(()=>doc.querySelector('#admin-product-form'));
let form=doc.querySelector('#admin-product-form');
// Chromium expõe o controle name=id como form.id; o roteador deve ler o atributo.
Object.defineProperty(form,'id',{value:form.elements.namedItem('id'),configurable:true});
for(const [name,value]of Object.entries({name:'Peça nova',brand:'Marca',model:'Modelo',price:'199.00',originalPrice:'199.00',stockQuantity:'10',description:'Texto',images:'/images/brand/logo.png',weightKg:'0.6',lengthCm:'30',widthCm:'20',heightCm:'15'}))form.elements[name].value=value;
form.dispatchEvent(new admin.window.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>savedProduct&&doc.querySelector('input[name=id]')?.value==='12345');assert.equal(savedProduct.stockQuantity,10);assert.equal(savedProduct.priceCents,19900);
doc.querySelector('.management-tabs a[href="/admin?tab=orders"]').click();await waitFor(()=>doc.querySelector('.order-card'));
doc.querySelector('.order-card').click();await waitFor(()=>doc.querySelector('#admin-order-form'));
form=doc.querySelector('#admin-order-form');form.elements.fulfillmentStatus.value='shipped';form.elements.trackingCode.value='ABC123';form.dispatchEvent(new admin.window.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>doc.querySelector('#admin-order-form [name=trackingCode]')?.value==='ABC123');assert.equal(order.fulfillmentStatus,'shipped');
admin.window.close();
user={...user,role:'customer'};order.status='pending';order.fulfillmentStatus='awaiting_payment';
const buyer=makeDOM('/checkout'),buyerDoc=buyer.window.document;
await waitFor(()=>buyerDoc.querySelector('#checkout-form'));
assert.equal(buyerDoc.querySelector('#pay-order').disabled,true);assert.equal(buyerDoc.querySelectorAll('#shipping-form').length,1);
form=buyerDoc.querySelector('#checkout-form');
for(const [name,value]of Object.entries(order.address))if(form.elements[name])form.elements[name].value=value;form.elements.phone.value='55996712043';
buyerDoc.querySelector('#shipping-cep').value='97950-000';buyerDoc.querySelector('#shipping-form').dispatchEvent(new buyer.window.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>buyerDoc.querySelector('[name=shipping-service]'));buyerDoc.querySelector('[name=shipping-service]').click();assert.equal(buyerDoc.querySelector('#pay-order').disabled,false);
assert.equal(buyerDoc.querySelector('#checkout-cart .cart-total:last-of-type strong').textContent,Number(p.price+25).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
for(const checkbox of form.querySelectorAll('[type=checkbox]'))checkbox.checked=true;
form.dispatchEvent(new buyer.window.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>buyer.window.location.pathname.startsWith('/pedido/'));
const creation=requests.find(r=>r.path==='/api/checkout');assert.ok(creation);assert.equal('totalCents' in creation.body,false);assert.equal(creation.body.address.cep,'97950-000');assert.equal(buyer.window.localStorage.getItem('stoffels-cart-v1')==='[]',false);
await waitFor(()=>buyerDoc.querySelector('#refresh-purchase'));assert.doesNotMatch(buyerDoc.querySelector('#main').textContent,/✓ Pagamento confirmado/);
order.status='paid';order.fulfillmentStatus='processing';buyerDoc.querySelector('#refresh-purchase').click();await waitFor(()=>buyerDoc.querySelector('.success-note'));assert.equal(buyer.window.localStorage.getItem('stoffels-cart-v1'),'[]');
buyer.window.close();console.log('Interface de comércio: cadastro administrativo, gestão e rastreio, checkout com endereço/frete, total, criação de pedido e confirmação somente pelo servidor verificados.');
