import {useRef,useState} from "react";
import {ApiError} from "../api/client";
import {mutationError} from "../features/ui";
import {useSession} from "../session/provider";

export function useAction(){
  const running=useRef(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const session=useSession();
  async function run<T>(operation:()=>Promise<T>){
    if(running.current)return;
    running.current=true;
    setBusy(true);
    setError(null);
    try {return await operation();}
    catch(cause){
      if(cause instanceof ApiError&&cause.code==="CANCELLED")return;
      if(cause instanceof ApiError&&cause.status===403)void session.revalidate();
      setError(mutationError(cause));
    }finally{running.current=false;setBusy(false);}
  }
  return {busy,error,setError,run};
}
