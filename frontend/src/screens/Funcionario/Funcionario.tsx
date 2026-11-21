import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { roleNames, type Grant } from "../../api/reali";
import { blank, Roles, SchoolGrant } from "../../features/StaffAccessFields";
import { Action, Feedback, Page, Panel, ui } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";

export default function Funcionario(){
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
