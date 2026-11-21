import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import type { Conversation } from "../../api/reali";
import { Action, Feedback, Field, Page, Pagination, Panel, stamp, ui } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";

export default function RealInova(){
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
