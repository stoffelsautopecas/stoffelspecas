import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const js=await readFile(new URL('../public/assets/app.js',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'http://localhost:3001/minha-conta',runScripts:'outside-only',pretendToBeVisual:true});
dom.window.scrollTo=()=>{};
let user=null,requestBody;
dom.window.fetch=async(url,options)=>{
 if(url==='/api/auth'){
  if(options?.body){requestBody=JSON.parse(options.body);if(requestBody.action==='register')user={name:'Cliente <teste>',email:requestBody.email,role:'customer'};if(requestBody.action==='logout')user=null;}
  return {ok:true,json:async()=>({user})};
 }
 if(String(url).startsWith('/api/admin'))return {ok:false,status:user?403:401,json:async()=>({error:'Acesso restrito'})};
 if(url==='/api/customer')return {ok:true,json:async()=>({user:{...user,phone:''},addresses:[]})};
 if(url==='/api/orders')return {ok:true,json:async()=>({orders:[]})};
 if(String(url).includes('catalog.json'))return {ok:true,json:async()=>[]};
 if(String(url).includes('categories.json'))return {ok:true,json:async()=>[]};
 throw new Error('URL inesperada: '+url);
};
const waitFor=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Estado esperado não encontrado');};
dom.window.eval(js);const doc=dom.window.document;
await waitFor(()=>doc.querySelector('#account-form'));
assert.equal(doc.querySelector('input[name="password"]').type,'password');
doc.querySelector('a[href="/minha-conta?cadastro=1"]').click();await waitFor(()=>doc.querySelector('input[name="name"]'));
let form=doc.querySelector('#account-form');form.elements.name.value='Cliente <teste>';form.elements.email.value='cliente@example.invalid';form.elements.password.value='password long enough';form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
await waitFor(()=>doc.querySelector('input[name="currentPassword"]'));
assert.equal(requestBody.action,'register');assert.match(doc.querySelector('h1').textContent,/Cliente <teste>/);assert.equal(doc.querySelector('h1 teste'),null);
assert.equal(dom.window.localStorage.getItem('token'),null);
dom.window.history.pushState({},'','/admin');dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));await waitFor(()=>doc.querySelector('h1')?.textContent==='Acesso restrito');
doc.querySelector('[data-logout]').click();await waitFor(()=>doc.querySelector('#account-form'));assert.match(doc.querySelector('h1').textContent,/painel/);
dom.window.close();console.log('Interface: entrada, cadastro, conta, escape de nome, bloqueio do painel e saída verificados.');
