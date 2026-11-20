export function credentialLink(path:string, host?:string|null) {
  try {
    const relative=path.startsWith("/")&&!path.startsWith("//");
    const url=new URL(path,"https://local.invalid");
    if(!relative&&(url.protocol!=="https:"||url.host!==host||url.username||url.password))return null;
    const route=url.pathname.replace(/\/$/,"");
    if(route!=="/ativar"&&route!=="/recuperar")return null;
    const candidates=new URLSearchParams(url.hash.slice(1)).getAll("token");
    const token=candidates.length===1&&/^[A-Za-z0-9_-]{20,256}$/.test(candidates[0])?candidates[0]:null;
    return {route,token};
  } catch {return null;}
}

const pending=new Map<string,string>();
const listeners=new Map<string,()=>void>();
export function rememberCredential(route:string,token:string){pending.set(route,token);listeners.get(route)?.();}
export function observeCredential(route:string,listener:()=>void){
  listeners.set(route,listener);
  return ()=>{if(listeners.get(route)===listener)listeners.delete(route);};
}
export function takeCredential(route:string){const token=pending.get(route)??null;pending.delete(route);return token;}
