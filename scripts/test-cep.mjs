import assert from 'node:assert/strict';
import {lookupCep} from '../lib/cep.js';
const provider=async url=>{assert.equal(url,'https://viacep.com.br/ws/01001000/json/');return {ok:true,json:async()=>({logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP'})};};
assert.deepEqual(await lookupCep('01001-000',provider),{cep:'01001000',street:'Praça da Sé',neighborhood:'Sé',city:'São Paulo',state:'SP'});
await assert.rejects(()=>lookupCep('../../etc',provider),/8 números/);
await assert.rejects(()=>lookupCep('99999999',async()=>({ok:true,json:async()=>({erro:true})})),/não encontrado/);
await assert.rejects(()=>lookupCep('01001000',async()=>{throw new Error('offline');}),/manualmente/);
assert.equal((await lookupCep('01001000',async()=>({ok:true,json:async()=>({localidade:'Cidade',uf:'RS'})}))).street,'');
console.log('CEP: formato, endereço completo, CEP geral, inexistente e falha de rede verificados.');
