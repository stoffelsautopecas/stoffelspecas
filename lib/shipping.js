import { AuthError,authPool,digest } from './auth.js';
const CALCULATE_URL='https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';
export function postalCode(value){const cep=String(value||'').replace(/\D/g,'');if(!/^\d{8}$/.test(cep)||/^0{8}$/.test(cep))throw new AuthError('Informe um CEP válido com 8 dígitos.');return cep;}
export function shippingCart(value){
 if(!Array.isArray(value)||!value.length||value.length>30)throw new AuthError('Informe de 1 a 30 produtos.');
 const map=new Map();
 for(const item of value){const id=Number(item?.id),quantity=item?.quantity;if(!Number.isSafeInteger(id)||id<1||id>999999999||!Number.isInteger(quantity)||quantity<1||quantity>99)throw new AuthError('Produto ou quantidade inválida.');map.set(id,(map.get(id)||0)+quantity);if(map.get(id)>99)throw new AuthError('Quantidade máxima excedida.');}
 return [...map].map(([id,quantity])=>({id,quantity})).sort((a,b)=>a.id-b.id);
}
export function buildShippingProducts(cart,records){
 const byId=new Map(records.map(p=>[p.id,p]));
 return cart.map(({id,quantity})=>{
  const p=byId.get(id),s=p?.shipping;
  if(!p?.available)throw new AuthError('Uma das peças está indisponível.',409);
  if(!s||![s.weightGrams,s.lengthCm,s.widthCm,s.heightCm].every(x=>Number.isFinite(x)&&x>0))throw new AuthError('As medidas de uma das peças precisam ser confirmadas pela loja.',409);
  if(s.restricted)throw new AuthError('Uma das peças exige conferência das condições de transporte. Consulte a loja.',409);
  const price=Number(p.price_cents);
  if(!Number.isSafeInteger(price)||price<1||price>100000000)throw new AuthError('O preço de uma das peças precisa ser confirmado pela loja.',409);
  return {id:String(id),quantity,width:s.widthCm,height:s.heightCm,length:s.lengthCm,weight:s.weightGrams/1000,insurance_value:price/100};
 });
}
export function quoteOptions(results){
 if(!Array.isArray(results))throw new AuthError('Resposta de frete inválida.',502);
 return results.filter(x=>x&&typeof x==='object'&&!x.error).flatMap(x=>{
  const raw=x.custom_price??x.price;
  if(!/^(?:\d+)(?:\.\d{1,2})?$/.test(String(raw)))return [];
  const priceCents=Math.round(Number(raw)*100),days=Number(x.custom_delivery_time??x.delivery_time);
  if(!Number.isSafeInteger(priceCents)||priceCents<0||!Number.isInteger(days)||days<0||days>365||!/^\d+$/.test(String(x.id)))return [];
  return [{serviceId:String(x.id),carrier:String(x.company?.name||'Transportadora').slice(0,100),name:String(x.name||'Entrega').slice(0,100),priceCents,deliveryDays:days}];
 }).sort((a,b)=>a.priceCents-b.priceCents);
}
export function freeShippingFallback(){return {serviceId:'free-no-quote',carrier:'Stoffels',name:'Frete grátis',priceCents:0,deliveryDays:null,freeFallback:true,deliveryMode:'store_arranged'};}
export async function calculateShipping({token,from,to,products},fetchImpl=fetch){
 if(!token)throw new AuthError('A consulta de frete está sendo configurada. Tente novamente mais tarde.',503);
 let response;
 try{response=await fetchImpl(CALCULATE_URL,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json','User-Agent':'Stoffels (acesso@stoffels.com)'},body:JSON.stringify({from:{postal_code:postalCode(from)},to:{postal_code:postalCode(to)},products,options:{receipt:false,own_hand:false}}),signal:AbortSignal.timeout(18000)});}catch{throw new AuthError('Não foi possível consultar o frete agora. Tente novamente.',502);}
 if([401,403].includes(response.status))throw new AuthError('A conexão com o serviço de frete precisa ser atualizada pela loja.',503);
 if(!response.ok)throw new AuthError('Não foi possível cotar este envio. Confira o CEP ou fale com a loja.',502);
 let result;try{result=await response.json();}catch{throw new AuthError('Resposta de frete inválida.',502);}
 const options=quoteOptions(result);
 // Política autorizada da loja: ausência de serviço em uma resposta válida gera frete grátis.
 // Falhas HTTP, autenticação, conexão e JSON inválido continuam sendo erros acima.
 if(!options.length)return [freeShippingFallback()];
 return options;
}
export function shippingFingerprint(cart,records){
 const byId=new Map(records.map(p=>[p.id,p]));return digest(JSON.stringify(cart.map(x=>({...x,price:String(byId.get(x.id)?.price_cents),shipping:byId.get(x.id)?.shipping}))));
}
// O checkout deve obter o valor daqui. Nunca cobrar o preço enviado pelo navegador.
export async function selectedShipping({quoteId,serviceId,cart,records,cep},client=authPool()){
 if(!/^[a-f0-9-]{36}$/.test(quoteId||''))throw new AuthError('Calcule o frete antes de continuar.');
 const {rows}=await client.query('select options from stoffels.shipping_quotes where id=$1 and cart_hash=$2 and postal_code=$3 and expires_at>now()',[quoteId,shippingFingerprint(cart,records),postalCode(cep)]);
 const option=rows[0]?.options.find(x=>x.serviceId===String(serviceId));
 if(!option)throw new AuthError('A cotação expirou ou o carrinho mudou. Calcule o frete novamente.',409);
 return option;
}

// Promoção por produto: somente as demais peças entram na cotação paga.
export async function quoteCartShipping({cart,records,token,from,to},fetchImpl=fetch){
 const byId=new Map(records.map(p=>[p.id,p]));
 for(const item of cart)if(!byId.get(item.id)?.available)throw new AuthError('Uma das peças está indisponível.',409);
 const paid=cart.filter(item=>byId.get(item.id).shipping?.freeShipping!==true);
 if(!paid.length)return [{...freeShippingFallback(),serviceId:'free-product',freeFallback:false,freePromotion:true}];
 return calculateShipping({token,from,to,products:buildShippingProducts(paid,records)},fetchImpl);
}
