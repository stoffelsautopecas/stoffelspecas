import { AuthError } from './auth.js';
export async function lookupCep(value,request=fetch){
 if(typeof value!=='string'||!/^\d{5}-?\d{3}$/.test(value))throw new AuthError('Informe um CEP com 8 números.');
 const cep=value.replace('-','');let data;
 try{const response=await request(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw new Error();data=await response.json();}catch{throw new AuthError('Não foi possível consultar o CEP. Preencha o endereço manualmente.',503);}
 if(data.erro)throw new AuthError('CEP não encontrado. Confira o número ou preencha o endereço manualmente.',404);
 if(typeof data.localidade!=='string'||typeof data.uf!=='string')throw new AuthError('Consulta de CEP indisponível. Preencha o endereço manualmente.',503);
 return {cep,street:typeof data.logradouro==='string'?data.logradouro:'',neighborhood:typeof data.bairro==='string'?data.bairro:'',city:data.localidade,state:data.uf};
}
