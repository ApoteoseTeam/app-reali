import { useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Text, View } from "react-native";
import { ApiError } from "../api/client";
import type { ChatInput, ChatOutput, Conversation } from "../api/reali";
import { ChatMessage } from "../components/ChatMessage/ChatMessage";
import { useAction } from "../hooks/useAction";
import { useRemote } from "../hooks/useRemote";
import { api, useSession } from "../session/provider";
import { Pagination } from "./Meals";
import { Action, Feedback, Field, labels, Page, Panel, stamp, ui } from "./ui";

export function ConversationList(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const [page,setPage]=useState(1);
  const [title,setTitle]=useState("");
  const [archived,setArchived]=useState(false);
  const conversations=useRemote(`conversations:${page}`,signal=>api.conversations(workspace.scope,signal,page));
  const action=useAction();
  const items=conversations.data?.results.filter(item=>
    (item.school_id===workspace.school!.id||item.school_id===null&&session.can("realinova_full"))
    &&(item.status==="ARCHIVED")===archived);
  function open(item:Conversation){router.push({pathname:"/conversa",params:{id:item.id}});}
  return <Page title="RealInova" refresh={conversations.refresh} refreshing={conversations.loading}>
    <Panel title={workspace.school!.name}>
      <Field label="Título da conversa (opcional)" value={title} onChangeText={setTitle} maxLength={120}/>
      <Action title="Nova conversa" disabled={action.busy} onPress={()=>void action.run(async()=>open(await api.createConversation(workspace.scope,workspace.school!.id,title.trim()||undefined)))}/>
    </Panel>
    <View style={ui.row}><Action title="Ativas" variant={archived?"flat":undefined} onPress={()=>setArchived(false)}/><Action title="Arquivadas" variant={archived?undefined:"flat"} onPress={()=>setArchived(true)}/></View>
    <Feedback loading={conversations.loading||action.busy} error={conversations.error??action.error} empty={items?.length===0} retry={conversations.refresh}/>
    {items?.map(item=><Panel key={item.id} title={item.title}>
      <Text style={ui.subdued}>{item.school_id?workspace.school!.name:"Escopo institucional"} · {stamp(item.last_message_at)}</Text>
      <Action title="Abrir conversa" variant="flat" onPress={()=>open(item)}/>
    </Panel>)}
    <Pagination page={page} next={Boolean(conversations.data?.next)} onChange={setPage}/>
  </Page>;
}

const sourceLabels:Record<string,string>={DAILY_METRICS:"Indicadores diários",PLATE_COUNTS:"Pratos servidos",STUDENT_COUNTS:"Entradas registradas",MEAL_FORECASTS:"Previsões originais",MEAL_SERVICE_METRICS:"Serviços de merenda",PERIOD_COMPARISON:"Comparação de períodos",SCHOOL_PERFORMANCE:"Desempenho histórico",SCHOOL_COMPARISON:"Comparação entre escolas"};
const errorLabels:Record<string,string>={AI_PROVIDER_UNAVAILABLE:"O provedor do RealInova está indisponível.",AI_PROVIDER_AUTH_FAILED:"A integração do RealInova está indisponível.",AI_PROVIDER_RATE_LIMITED:"O provedor atingiu o limite de uso.",AI_TIMEOUT:"O RealInova demorou a responder.",AI_TOOL_ERROR:"Os indicadores não puderam ser consultados."};

export function ConversationDetail(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const {id}=useLocalSearchParams<{id:string}>();
  const [message,setMessage]=useState(""),[notice,setNotice]=useState(""),[page,setPage]=useState<number|null>(null),[confirm,setConfirm]=useState(false);
  const pending=useRef<ChatInput|null>(null);
  const [recoverable,setRecoverable]=useState(false);
  const action=useAction();
  const conversation=useRemote(`conversation:${id}`,async signal=>{
    const row=await api.conversation(workspace.scope,id,signal);
    if(row.school_id!==workspace.school!.id&&(row.school_id!==null||!session.can("realinova_full")))throw new ApiError(404,"WRONG_SCHOOL","Abra a conversa no contexto autorizado.");
    return row;
  },typeof id==="string");
  const log=useRemote(`messages:${id}:${page??"latest"}`,async signal=>{
    const query=(p:number)=>api.messages(workspace.scope,id,signal,p);
    const first=await query(page??1),last=Math.max(1,Math.ceil(first.count/50));
    return {result:page===null&&last>1?await query(last):first,page:page??last};
  },Boolean(conversation.data),recoverable?5000:0);

  function send(reuse=false){
    if(!conversation.data||action.busy)return;
    const row=conversation.data;
    const body=reuse?pending.current:{conversation_id:id,school_id:row.school_id??undefined,client_request_id:randomUUID(),message:message.trim()};
    if(!body?.message)return;
    pending.current=body;
    setRecoverable(false);
    setNotice("");
    void action.run(async()=>{
      try{
        const response=await api.chat(workspace.scope,body);
        setMessage("");setPage(null);log.refresh();conversation.refresh();
        if(response.status==="PENDING"){
          setNotice("A resposta está em processamento.");
          setRecoverable(true);
        }else{
          pending.current=null;
          setNotice(response.error?.message??"");
        }
      }catch(error){
        if(error instanceof ApiError&&error.code==="CANCELLED")throw error;
        const data=error instanceof ApiError?error.data as Partial<ChatOutput>|null:null;
        if(data?.status==="FAILED"&&data.message_id){
          pending.current=null;setMessage("");setPage(null);log.refresh();
        }else if(error instanceof ApiError&&["OFFLINE","TIMEOUT","AI_CONVERSATION_BUSY"].includes(error.code)){
          setRecoverable(true);setNotice("Verifique o histórico ou recupere o mesmo envio.");
        }else pending.current=null;
        throw error;
      }
    });
  }

  return <Page title={conversation.data?.title??"Conversa do RealInova"} refresh={()=>{conversation.refresh();log.refresh();}} refreshing={log.loading||conversation.loading}>
    <Feedback loading={conversation.loading||log.loading||action.busy} error={conversation.error??log.error??action.error} retry={log.refresh}/>
    {conversation.data&&<>
      <Text style={ui.subdued}>{conversation.data.school_id?workspace.school!.name:workspace.organization.name}</Text>
      <Feedback empty={log.data?.result.results.length===0}/>
      {log.data?.result.results.map(item=><ChatMessage key={item.id} remetente={item.role==="USER"?"usuario":"assistente"}
        mensagem={item.content||(item.status==="PENDING"?"Resposta em processamento.":errorLabels[item.error_code]??"A resposta ficou indisponível.")}
        fonte={item.sources?.map(source=>`${sourceLabels[source.type]??"Indicador"} · ${source.period.start_date} a ${source.period.end_date}`).join("\n")}
        observacao={item.sources?.some(source=>source.rows.some(row=>row.stale||["PROVISIONAL","PARTIAL","STALE"].includes(row.data_status??"")))?labels("PROVISIONAL"):undefined}/>)}
      {log.data&&<Pagination page={log.data.page} next={Boolean(log.data.result.next)} onChange={setPage}/>}
      {notice&&<Text accessibilityRole="alert" style={ui.subdued}>{notice}</Text>}
      {conversation.data.status==="ACTIVE"&&<Panel title="Mensagem">
        <Field label="Pergunte ao RealInova" testID="chat-message" value={message} onChangeText={setMessage} multiline maxLength={2000} editable={!action.busy&&!recoverable}/>
        <Action title={action.busy?"Aguardando resposta…":"Enviar mensagem"} disabled={!message.trim()||action.busy||recoverable} onPress={()=>send()}/>
        {recoverable&&<><Action title="Recuperar o mesmo envio" disabled={action.busy} onPress={()=>send(true)}/>
          <Action title="Consultar histórico" variant="flat" onPress={log.refresh}/></>}
      </Panel>}
      <View style={ui.row}><Action title={conversation.data.status==="ACTIVE"?"Arquivar conversa":"Reativar conversa"} variant="flat" disabled={action.busy} onPress={()=>void action.run(async()=>{
        await api.conversationStatus(workspace.scope,id,conversation.data!.status==="ACTIVE"?"ARCHIVED":"ACTIVE");conversation.refresh();
      })}/>
      <Action title={confirm?"Confirmar exclusão da conversa":"Excluir conversa"} variant="danger" disabled={action.busy} onPress={()=>{
        if(!confirm){setConfirm(true);return;}void action.run(async()=>{await api.deleteConversation(workspace.scope,id);router.back();});
      }}/></View>
    </>}
  </Page>;
}
