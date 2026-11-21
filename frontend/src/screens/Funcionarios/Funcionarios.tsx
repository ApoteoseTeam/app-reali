import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { roleNames, type Grant } from "../../api/reali";
import { blank, Roles, SchoolGrant } from "../../features/StaffAccessFields";
import { Action, Feedback, Field, labels, Page, Pagination, Panel, stamp, ui } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";

export default function Funcionarios(){
  const workspace=useSession().workspace!,router=useRouter();
  const [tab,setTab]=useState<"staff"|"invitations">("staff"),[page,setPage]=useState(1),[form,setForm]=useState(false);
  const [email,setEmail]=useState(""),[role,setRole]=useState("COOK"),[grant,setGrant]=useState<Grant>(blank);
  const [confirm,setConfirm]=useState<string|null>(null),[notice,setNotice]=useState("");
  const staff=useRemote(`staff:${page}`,signal=>api.employees(workspace.scope,{page},signal),tab==="staff");
  const invites=useRemote("invites",signal=>api.invites(workspace.scope,signal),tab==="invitations");
  const action=useAction();
  return <Page title="Funcionários e convites" refresh={tab==="staff"?staff.refresh:invites.refresh} refreshing={staff.loading||invites.loading}>
    <View style={ui.row}><Action title="Funcionários" variant={tab==="staff"?undefined:"flat"} onPress={()=>setTab("staff")}/><Action title="Convites" variant={tab==="invitations"?undefined:"flat"} onPress={()=>setTab("invitations")}/></View>
    <Feedback loading={staff.loading||invites.loading||action.busy} error={action.error??(tab==="staff"?staff.error:invites.error)} empty={tab==="staff"?staff.data?.results.length===0:invites.data?.length===0} retry={tab==="staff"?staff.refresh:invites.refresh}/>
    {notice&&<Text accessibilityRole="alert" style={ui.text}>{notice}</Text>}
    {tab==="staff"&&<>{staff.data?.results.map(member=><Panel key={member.id} title={member.user.full_name}>
      <Text style={ui.text}>{member.user.email} · {roleNames[member.role]??member.role} · {member.is_active?"Ativo":"Desativado"}</Text>
      <Action title="Ver vínculo" onPress={()=>router.push({pathname:"/funcionario",params:{id:member.id}})}/>
    </Panel>)}<Pagination page={page} next={Boolean(staff.data?.next)} onChange={setPage}/></>}
    {tab==="invitations"&&<>
      <Action title="Convidar funcionário" onPress={()=>{setForm(!form);setNotice("");action.setError(null);}}/>
      {form&&<Panel title="Novo convite">
        <Field label="E-mail" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail}/>
        <Roles role={role} onChange={setRole}/>
        <SchoolGrant schools={workspace.schools} grant={grant} update={setGrant} all={workspace.member.all_schools_access}/>
        <Action title="Enviar convite" disabled={action.busy||!email.trim().includes("@")||!grant.all_schools_access&&!grant.school_ids.length}
          onPress={()=>void action.run(async()=>{
            const result=await api.invite(workspace.scope,{email:email.trim(),role,...grant});
            setForm(false);setEmail("");setGrant(blank);setNotice(`Convite registrado · Entrega ${labels(result.delivery_status)}`);invites.refresh();
          })}/>
      </Panel>}
      {invites.data?.map(invite=><Panel key={invite.id} title={invite.email}>
        <Text style={ui.text}>{roleNames[invite.role]??invite.role} · {labels(invite.status)} · Entrega {labels(invite.delivery_status)}</Text>
        <Text style={ui.subdued}>Expira {stamp(invite.expires_at)}</Text>
        <Text style={ui.subdued}>{invite.all_schools_access?"Todas as escolas":invite.school_ids.map(id=>workspace.schools.find(school=>school.id===id)?.name).filter(Boolean).join(", ")}</Text>
        {["PENDING","EXPIRED"].includes(invite.status)&&<Action title="Reenviar convite" disabled={action.busy} onPress={()=>void action.run(async()=>{await api.inviteAction(workspace.scope,invite.id,"resend");invites.refresh();})}/>}
        {invite.status==="PENDING"&&<Action title={confirm===invite.id?"Confirmar revogação":"Revogar convite"} variant="danger" disabled={action.busy} onPress={()=>{
          if(confirm!==invite.id){setConfirm(invite.id);return;}void action.run(async()=>{await api.inviteAction(workspace.scope,invite.id,"revoke");setConfirm(null);invites.refresh();});
        }}/>}
      </Panel>)}
    </>}
  </Page>;
}
