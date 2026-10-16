/** Integração exclusivamente do servidor: nunca aceite preços enviados pelo navegador. */
export class CheckoutError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
const PAYMENT_HOSTS=new Set(['checkout.infinitepay.io','buy.infinitepay.io','checkout.infinitepay.com.br']);
export function validatePaymentUrl(value) {
  let url;
  try{url=new URL(value);}catch{throw new CheckoutError('A InfinitePay retornou um link inválido.',502);}
  if(url.protocol!=='https:'||!PAYMENT_HOSTS.has(url.hostname)||url.username||url.password||url.port)throw new CheckoutError('A InfinitePay retornou um destino inválido.',502);
  return url.toString();
}
export function normalizeCart(value) {
  if(!Array.isArray(value)||value.length<1||value.length>30)throw new CheckoutError('O carrinho deve conter de 1 a 30 peças.');
  const entries=new Map();
  for(const item of value){
    const id=String(item?.id||'');const quantity=item?.quantity;
    if(!/^\d{1,9}$/.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>99)throw new CheckoutError('Peça ou quantidade inválida.');
    const total=(entries.get(id)||0)+quantity;
    if(total>99)throw new CheckoutError('Quantidade máxima excedida.');
    entries.set(id,total);
  }
  return [...entries].map(([id,quantity])=>({id:Number(id),quantity})).sort((a,b)=>a.id-b.id);
}
export function priceCart(items,records) {
  const byId=new Map(records.map(p=>[p.id,p]));
  return items.map(item=>{
    const product=byId.get(item.id);
    if(!product?.available)throw new CheckoutError('Uma das peças não está disponível.',409);
    if(product.stockQuantity===null||!Number.isInteger(product.stockQuantity))throw new CheckoutError('O estoque desta peça precisa ser confirmado pela loja.',409);
    if(product.stockQuantity<item.quantity)throw new CheckoutError('A quantidade solicitada não está disponível.',409);
    if(!Number.isSafeInteger(product.priceCents)||product.priceCents<=0||product.priceCents>100000000)throw new CheckoutError('O preço desta peça precisa ser confirmado pela loja.',409);
    return {productId:product.id,name:product.name,quantity:item.quantity,unitPriceCents:product.priceCents};
  });
}
export function checkoutPayload({handle,order,items,redirectUrl,webhookUrl,customer,address}) {
  if(!/^[\w.-]{1,100}$/.test(handle||''))throw new CheckoutError('Conta recebedora não configurada.',503);
  if(!Number.isSafeInteger(order.shippingCents)||order.shippingCents<0)throw new CheckoutError('Frete inválido.');
  const subtotal=items.reduce((sum,x)=>sum+x.quantity*x.unitPriceCents,0);
  if(!Number.isSafeInteger(subtotal)||subtotal+order.shippingCents!==order.totalCents)throw new CheckoutError('O total do pedido não confere.');
  const lines=items.map(x=>({quantity:x.quantity,price:x.unitPriceCents,description:x.name.slice(0,200)}));
  if(order.shippingCents>0)lines.push({quantity:1,price:order.shippingCents,description:'Frete — '+(order.shippingLabel||'Entrega')});
  return {handle,order_nsu:order.id,items:lines,redirect_url:redirectUrl,webhook_url:webhookUrl,
    ...(customer?{customer}:{}),...(address?{address}:{})};
}
export function validPaymentResult(result,expectedAmount) {
  // amount é o valor da venda; paid_amount pode incluir taxas e juros do cartão.
  return result?.success===true&&result.paid===true&&Number.isSafeInteger(result.amount)&&result.amount===expectedAmount&&['pix','credit_card'].includes(result.capture_method);
}
export function createInfinitePayClient(fetchImpl=globalThis.fetch) {
  async function post(path,body){
    let response;
    try{response=await fetchImpl('https://api.checkout.infinitepay.io/'+path,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}
    catch{throw new CheckoutError('Não foi possível falar com a InfinitePay. Tente novamente mais tarde.',502);}
    if(!response.ok){const error=new CheckoutError('A InfinitePay não aceitou a solicitação. Verifique os dados ou fale com a loja.',502);error.definitive=[400,401,403,404,422].includes(response.status);throw error;}
    try{return await response.json();}catch{throw new CheckoutError('Resposta inválida da InfinitePay.',502);}
  }
  return {
    async createLink(payload){const result=await post('links',payload);return {url:validatePaymentUrl(result.url||result.checkout_url||result.link),slug:typeof result.slug==='string'?result.slug:null};},
    async checkPayment({handle,orderId,transactionNsu,slug}){
      if(!/^[a-zA-Z0-9_-]{1,150}$/.test(slug||'')||!/^[-a-zA-Z0-9]{1,100}$/.test(transactionNsu||''))throw new CheckoutError('Referência de pagamento inválida.');
      return post('payment_check',{handle,order_nsu:orderId,transaction_nsu:transactionNsu,slug});
    },
  };
}
