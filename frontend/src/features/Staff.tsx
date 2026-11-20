import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { roleNames, type Grant, type School } from "../api/reali";
import { useAction } from "../hooks/useAction";
import { useRemote } from "../hooks/useRemote";
import { api, useSession } from "../session/provider";
import { Pagination } from "./Meals";
import { Action, Feedback, Field, labels, Page, Panel, stamp, ui } from "./ui";

const roles=Object.keys(roleNames).filter(role=>role!=="ADMIN");
const blank:Grant={all_schools_access:false,school_ids:[]};
function Roles({role,onChange}:{role:string;onChange:(role:string)=>void}){
  return <View style={ui.row}>{roles.map(option=><Action key={option} title={roleNames[option]} variant={role===option?undefined:"flat"} onPress={()=>onChange(option)}/>)}</View>;
}
function SchoolGrant({schools,grant,update,all}:{schools:School[];grant:Grant;update:(value:Grant)=>void;all:boolean}){
  return <>
    {all&&<Action title={grant.all_schools_access?"Todas as escolas selecionadas":"Autorizar todas as escolas"} variant={grant.all_schools_access?undefined:"flat"} onPress={()=>update({school_ids:[],all_schools_access:!grant.all_schools_access})}/>}
    {!grant.all_schools_access&&<View style={ui.row}>{schools.map(school=><Action key={school.id} title={school.name} variant={grant.school_ids.includes(school.id)?undefined:"flat"}
      onPress={()=>update({all_schools_access:false,school_ids:grant.school_ids.includes(school.id)?grant.school_ids.filter(id=>id!==school.id):[...grant.school_ids,school.id]})}/>)}</View>}
  </>;
}
export function StaffList(){
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
export function StaffDetail(){
  const session=useSession(),workspace=session.workspace!;
  const {id}=useLocalSearchParams<{id:string}>();
  const [role,setRole]=useState<string|null>(null),[grant,setGrant]=useState<Grant|null>(null);
  const [confirm,setConfirm]=useState(false);
  const action=useAction();
  const record=useRemote(`staff-member:${id}`,signal=>api.employee(workspace.scope,id,signal),typeof id==="string");
  const schools=useRemote(`staff-schools:${id}`,signal=>api.grant(workspace.scope,id,signal),Boolean(record.data));
  const member=record.data;
  function refresh(){record.refresh();schools.refresh();}
  return <Page title="Vínculo do funcionário" refresh={refresh} refreshing={record.loading||schools.loading}>
    <Feedback loading={record.loading||schools.loading||action.busy} error={record.error??schools.error??action.error} retry={refresh}/>
    {member&&<Panel title={member.user.full_name}>
      <Text style={ui.text}>{member.user.email} · {member.is_active?"Ativo":"Desativado"}</Text>
      <Text style={ui.text}>{roleNames[member.role]??member.role}</Text>
      {schools.data&&<Text style={ui.subdued}>{schools.data.all_schools_access?"Acesso a todas as escolas":schools.data.school_ids.map(key=>workspace.schools.find(item=>item.id===key)?.name).filter(Boolean).join(", ")}</Text>}
      <Action title="Alterar função" variant="flat" onPress={()=>setRole(member.role==="ADMIN"?"DIRECTOR":member.role)}/>
      <Action title="Alterar escolas" variant="flat" disabled={!schools.data} onPress={()=>setGrant(schools.data??blank)}/>
      <Action title={confirm?"Confirmar alteração":member.is_active?"Desativar vínculo":"Reativar vínculo"} disabled={action.busy} variant={member.is_active?"danger":undefined}
        onPress={()=>{if(!confirm){setConfirm(true);return;}void action.run(async()=>{await api.employeeActive(workspace.scope,id,!member.is_active);setConfirm(false);refresh();await session.revalidate();});}}/>
    </Panel>}
    {role&&<Panel title="Função"><Roles role={role} onChange={setRole}/>
      <Action title="Salvar função" disabled={action.busy} onPress={()=>void action.run(async()=>{await api.employeeRole(workspace.scope,id,role);setRole(null);refresh();await session.revalidate();})}/>
    </Panel>}
    {grant&&<Panel title="Escolas autorizadas"><SchoolGrant schools={workspace.schools} grant={grant} update={setGrant} all={workspace.member.all_schools_access}/>
      <Action title="Salvar escolas" disabled={action.busy||!grant.all_schools_access&&!grant.school_ids.length} onPress={()=>void action.run(async()=>{await api.saveGrant(workspace.scope,id,grant);setGrant(null);refresh();await session.revalidate();})}/>
    </Panel>}
  </Page>;
}
