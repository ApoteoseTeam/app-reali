import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../api/client";
import { useSession } from "../session/provider";

type Load<T> = (signal:AbortSignal) => Promise<T>;
type State<T> = {key:string; data?:T; error?:Error; loading:boolean};
type Request<T> = {pending?:Promise<T>; controller?:AbortController; data?:T; refs:number};

export function useRemote<T>(key:string, load:Load<T>, enabled=true, interval=0) {
  const session=useSession();
  const cache=session.workspace?.cache;
  const fullKey=(session.workspace?.key??"")+"/"+key;
  const loader=useRef(load);
  const access=useRef(session.revalidate);
  useEffect(()=>{loader.current=load;access.current=session.revalidate;},[load,session.revalidate]);
  const [state,setState]=useState<State<T>>({key:fullKey,loading:enabled});
  const refresh=useRef<()=>void>(()=>undefined);
  const reload=useCallback(()=>refresh.current(),[]);
  useEffect(()=>{
    if (!enabled||!cache) return;
    let current=true;
    const entry=(cache.get(key) as Request<T>|undefined)??{refs:0};
    cache.set(key,entry);
    entry.refs++;
    const run=()=>{
      if (!current) return;
      setState({key:fullKey,data:entry.data,loading:true});
      if (!entry.pending) {
        const controller=new AbortController();
        entry.controller=controller;
        const pending=Promise.resolve().then(()=>loader.current(controller.signal));
        entry.pending=pending;
        void pending.then(data=>{ if(entry.pending===pending) entry.data=data; },error=>{
          if (entry.pending === pending && error instanceof ApiError && [401,403,404].includes(error.status)) entry.data=undefined;
        }).finally(()=>{ if(entry.pending===pending) entry.pending=undefined; });
      }
      void entry.pending.then(data=>{ if(current) setState({key:fullKey,data,loading:false}); },error=>{
        if (!current || error instanceof ApiError && error.code==="CANCELLED") return;
        setState({key:fullKey,data:entry.data,error,loading:false});
        if(error instanceof ApiError && error.status===403) void access.current();
      });
    };
    refresh.current=run;
    run();
    const timer=interval>0 ? setInterval(run,interval) : undefined;
    return ()=>{
      current=false;
      if(timer)clearInterval(timer);
      entry.refs--;
      if(!entry.refs&&entry.pending){entry.controller?.abort();entry.pending=undefined;}
      if(refresh.current===run)refresh.current=()=>undefined;
    };
  },[cache,enabled,fullKey,interval,key]);
  return {...(state.key===fullKey?state:{key:fullKey,loading:enabled}),refresh:reload};
}
