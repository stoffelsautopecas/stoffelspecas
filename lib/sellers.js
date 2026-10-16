import {AuthError} from './auth.js';
export const sellers={thiago:'Thiago',vitor:'Vitor'};
export function requestSeller(req){const value=req.headers['x-stoffels-seller'];if(!value)return null;if(!Object.hasOwn(sellers,value))throw new AuthError('Escolha Thiago ou Vitor para continuar.');return value;}
export function adminSeller(user){if(user?.role!=='admin'||!Object.hasOwn(sellers,user.seller_slug))throw new AuthError('Acesso restrito ao seu painel.',403);return user.seller_slug;}
