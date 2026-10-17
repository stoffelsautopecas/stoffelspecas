import {AuthError} from './auth.js';
export const sellers={thiago:'Thiago',rennan:'Rennan',both:'Não fui atendido'};
export const whatsapp={thiago:'5515981759317',rennan:'5519983420556'};
export function requestSeller(req){const value=req.headers['x-stoffels-seller'];if(!value)return null;if(!Object.hasOwn(sellers,value))throw new AuthError('Escolha Thiago ou Rennan para continuar.');return value;}
export function adminSeller(user){if(user?.role!=='admin'||!['thiago','rennan'].includes(user.seller_slug))throw new AuthError('Acesso restrito ao seu painel.',403);return user.seller_slug;}
