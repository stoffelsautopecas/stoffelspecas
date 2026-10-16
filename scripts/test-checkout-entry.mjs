import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';
const root=new URL('../public/',import.meta.url),html=await readFile(new URL('index.html',root),'utf8'),js=await readFile(new URL('assets/app.js',root),'utf8');const product=JSON.parse(await readFile(new URL('data/catalog.json',root),'utf8')).find(p=>p.available);
const wait=async f=>{for(let i=0;i<300;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('Estado esperado não encontrado');};
let user=null,requests=[],pending=[];
const dom=new JSDOM(html,{url:'https://www.stoffelsautopecas.com.br/'+product.slug,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.fetch=async(url,options={})=>{requests.push(url);const path=new URL(url,w.location.origin).pathname;const body=options.body&&JSON.parse(options.body);let data;
 if(path==='/api/store')data={settings:{}};
 else if(path==='/data/catalog.json')data=[product];
 else if(path==='/data/categories.json')data=[];
 else if(path.startsWith('/data/products/'))data={...product,images:[product.image],description:''};
 else if(path==='/api/auth'){if(body?.action==='register')user={name:body.name,email:body.email,role:'customer'};data={user};}
 else if(path==='/api/customer')data={user:{...user,phone:''},addresses:[]};
 else if(path==='/api/cep')return new Promise(resolve=>pending.push({url,resolve}));
 else throw Error('URL inesperada '+url);
 return {ok:true,json:async()=>data};
};
w.eval(js);await wait(()=>d.querySelector('[data-add]'));d.querySelector('[data-add]').click();assert.equal(d.querySelector('#cart-dialog').open,true);
d.querySelector('#go-checkout').click();await wait(()=>d.querySelector('#account-form'));assert.equal(d.querySelector('#account-form').dataset.action,'register');assert.match(w.location.search,/next=%2Fcheckout/);assert.equal(JSON.parse(w.localStorage.getItem('stoffels-cart-v1')).length,1);
let form=d.querySelector('#account-form');for(const [k,v]of Object.entries({name:'Cliente Teste',email:'teste@example.invalid',password:'senha longa teste'}))form.elements[k].value=v;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>d.querySelector('#checkout-form'));form=d.querySelector('#checkout-form');assert.equal(w.location.pathname,'/checkout');
const typeCep=cep=>{form.elements.cep.value=cep;form.elements.cep.dispatchEvent(new w.Event('input',{bubbles:true}));};
form.elements.number.value='1287';typeCep('01001000');await wait(()=>pending.length===1);typeCep('20040002');await wait(()=>pending.length===2);
pending[1].resolve({ok:true,json:async()=>({street:'Rua Nova',neighborhood:'Centro',city:'Rio de Janeiro',state:'RJ'})});await wait(()=>form.elements.city.value==='Rio de Janeiro');pending[0].resolve({ok:true,json:async()=>({street:'Rua antiga',neighborhood:'Antigo',city:'São Paulo',state:'SP'})});await new Promise(r=>setTimeout(r,10));assert.equal(form.elements.city.value,'Rio de Janeiro');assert.equal(form.elements.number.value,'1287');
typeCep('97950000');await wait(()=>pending.length===3);pending[2].resolve({ok:true,json:async()=>({street:'',neighborhood:'',city:'Guarani das Missões',state:'RS'})});await wait(()=>form.elements.state.value==='RS');assert.equal(form.elements.street.value,'');assert.match(form.querySelector('.cep-feedback').textContent,/Complete rua/);
typeCep('99999999');await wait(()=>pending.length===4);pending[3].resolve({ok:false,json:async()=>({error:'CEP não encontrado. Preencha manualmente.'})});await wait(()=>form.querySelector('.cep-feedback').textContent.includes('não encontrado'));assert.equal(form.elements.street.disabled,false);
// Cliente autenticado volta diretamente aos dados, sem novo cadastro.
w.history.pushState({},'','/checkout');w.dispatchEvent(new w.PopStateEvent('popstate'));await wait(()=>d.querySelector('#checkout-form')&&d.querySelector('#checkout-form')!==form);await new Promise(r=>setTimeout(r,10));if(pending[4])pending[4].resolve({ok:false,json:async()=>({error:'CEP não encontrado.'})});await new Promise(r=>setTimeout(r,10));assert.equal(d.querySelector('#account-form'),null);
w.close();console.log('Carrinho automático, cadastro com retorno à compra, cliente logado, CEP e respostas fora de ordem verificados.');
