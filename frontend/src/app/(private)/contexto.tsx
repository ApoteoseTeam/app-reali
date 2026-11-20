import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Action, Feedback, Page, Panel, ui } from "../../features/ui";
import { useSession } from "../../session/provider";

export default function ContextSelection(){
  const session=useSession();
  const router=useRouter();
  return <Page title="Organização e escola">
    <Feedback loading={session.selecting} error={session.error} retry={()=>{void session.revalidate();}}/>
    <Panel title="Organizações">
      {!session.organizations.length&&<Text style={ui.subdued}>Nenhum vínculo ativo disponível.</Text>}
      <View style={ui.row}>{session.organizations.map(org=><Action key={org.id} title={org.name} disabled={session.selecting}
        variant={org.id===session.workspace?.organization.id?undefined:"flat"} onPress={()=>{void session.select(org.id);}}/>)}</View>
    </Panel>
    {session.workspace&&<Panel title="Escolas autorizadas">
      {!session.workspace.schools.length&&<Text style={ui.subdued}>Nenhuma escola ativa disponível nesta instituição.</Text>}
      {session.workspace.schools.map(school=><Action key={school.id} title={school.name} disabled={session.selecting} testID="school-option"
        variant={school.id===session.workspace?.school?.id?undefined:"flat"} onPress={()=>{void session.select(school.organization,school.id);}}/>)}
    </Panel>}
    <Action title="Continuar para o início" disabled={!session.workspace?.school||session.selecting} onPress={()=>router.replace("/inicio")}/>
    <Action title="Sair da conta" variant="flat" onPress={()=>{void session.signOut();}}/>
  </Page>;
}
