import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Platform, Text } from "react-native";
import { ApiError } from "../../api/client";
import { useAction } from "../../hooks/useAction";
import { credentialLink, observeCredential, takeCredential } from "../../session/links";
import { api, useSession } from "../../session/provider";
import { Action, Feedback, Field, Page, Panel, ui } from "../../features/ui";

export default function AccountLink({mode}:{mode:"activate"|"reset"}){
  const route=mode==="activate"?"/ativar":"/recuperar";
  const session=useSession();
  const router=useRouter();
  const [token,setToken]=useState<string|null>(null);
  const [verification,setVerification]=useState<{token:string;valid:boolean;error?:string}|null>(null);
  const checking=mode==="activate"&&Boolean(token)&&verification?.token!==token;
  const verified=mode==="reset"||verification?.token===token&&verification?.valid;
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [existing,setExisting]=useState(false);
  const [completed,setCompleted]=useState("");
  const action=useAction();

  useEffect(()=>{
    const browser=Platform.OS==="web"&&typeof window!=="undefined"?window:null;
    const fromWeb=browser?credentialLink(browser.location.pathname+browser.location.hash):null;
    const receive=()=>{
      const incoming=takeCredential(route)??fromWeb?.token??null;
      if(browser&&fromWeb?.token)browser.history.replaceState(browser.history.state,"",browser.location.pathname);
      if(incoming)setToken(incoming);
    };
    let mounted=true;
    const unsubscribe=observeCredential(route,receive);
    void Promise.resolve().then(()=>{if(mounted)receive();});
    return ()=>{mounted=false;unsubscribe();};
  },[route]);

  useEffect(()=>{
    if(mode!=="activate"||!token)return;
    const controller=new AbortController();
    void api.verifyInvite(token,controller.signal).then(result=>{
      if(!controller.signal.aborted)setVerification({token,valid:result.valid});
    },error=>{
      if(!controller.signal.aborted)setVerification({token,valid:false,error:error instanceof Error?error.message:"Convite indisponível."});
    });
    return ()=>controller.abort();
  },[mode,token]);

  function submit(){
    void action.run(async()=>{
      if(!token){
        if(mode!=="reset")throw new Error("Abra o link de ativação recebido por e-mail.");
        if(!email.trim().includes("@"))throw new Error("Informe um e-mail válido.");
        setCompleted((await api.resetRequest(email.trim())).message);
        return;
      }
      if(mode==="activate"&&(existing||session.status==="AUTHENTICATED")){
        if(session.status!=="AUTHENTICATED"){
          if(!email.trim().includes("@")||!password)throw new Error("Informe o e-mail e a senha da conta já cadastrada.");
          await session.signIn(email.trim(),password);
        }
        setCompleted((await api.activate({token},true)).message);
        await session.revalidate();
      }else{
        if(password.length<12||password!==confirmation)throw new Error("Use pelo menos 12 caracteres e confirme a senha.");
        const body={token,password,password_confirmation:confirmation};
        if(mode==="activate"){
          if(!name.trim())throw new Error("Informe seu nome completo.");
          try{setCompleted((await api.activate({...body,full_name:name.trim()},false)).message);}
          catch(error){if(error instanceof ApiError&&error.status===401){setExisting(true);setPassword("");setConfirmation("");}throw error;}
        }else{
          await api.resetConfirm(body);
          setCompleted("Senha redefinida. Entre com a nova senha.");
        }
      }
      setPassword("");setConfirmation("");setToken(null);
    });
  }

  return <Page title={mode==="activate"?"Ativar conta":"Recuperar acesso"}>
    <Feedback loading={checking} error={action.error??(verification?.token===token?verification.error:undefined)}/>
    {completed ? <Panel><Text accessibilityRole="alert" style={ui.text}>{completed}</Text></Panel> : null}
    {mode==="activate"&&!token&&!completed&&!checking&&<Text style={ui.text}>Abra o link de ativação recebido por e-mail.</Text>}
    {((mode==="reset"&&!completed)||(mode==="activate"&&token&&verified&&!checking))&&<Panel>
      {mode==="activate"&&session.status!=="AUTHENTICATED"&&<Action title={existing?"Definir senha para nova conta":"Já tenho conta"} variant="flat" onPress={()=>{setExisting(!existing);setPassword("");setConfirmation("");action.setError(null);}}/>}
      {(!token||existing&&session.status!=="AUTHENTICATED")&&<Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>}
      {token&&(!existing&&session.status!=="AUTHENTICATED"||mode==="reset")&&<>
        {mode==="activate"&&<Field label="Nome completo" value={name} onChangeText={setName} maxLength={160}/>}
        <Field label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry maxLength={256}/>
        <Field label="Confirme a nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry maxLength={256}/>
      </>}
      {token&&existing&&session.status!=="AUTHENTICATED"&&<Field label="Senha atual" value={password} onChangeText={setPassword} secureTextEntry/>}
      <Action title={mode==="activate"?"Ativar vínculo":token?"Redefinir senha":"Enviar instruções"} disabled={action.busy||session.status==="INITIALIZING"} onPress={submit}/>
    </Panel>}
    <Action title={session.status==="AUTHENTICATED"?"Voltar para o Reali":"Voltar ao login"} variant="flat"
      onPress={()=>router.dismissTo(session.status==="AUTHENTICATED"?"/":"/entrar")}/>
  </Page>;
}
