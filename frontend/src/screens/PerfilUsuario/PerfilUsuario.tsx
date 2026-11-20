import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { CircleUser } from "lucide-react-native";
import { Card } from "../../components/Card/Card";
import { colors } from "../../theme/colors";
import { useAction } from "../../hooks/useAction";
import { api, useSession } from "../../session/provider";
import { roleNames } from "../../api/reali";
import { Action, Feedback, Field, Page, Panel, ui } from "../../features/ui";
import { styles } from "./styles";

export default function PerfilUsuario(){
  const session=useSession();
  const workspace=session.workspace!;
  const member=workspace.member;
  const router=useRouter();
  const [name,setName]=useState(session.me?.user.full_name??"");
  const [current,setCurrent]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [edit,setEdit]=useState(false);
  const [change,setChange]=useState(false);
  const [notice,setNotice]=useState("");
  const action=useAction();
  return <Page title="Meu perfil">
    <View style={styles.avatarArea}><View style={styles.avatarBorda}><CircleUser size={52} color={colors.primary}/></View></View>
    <Text style={styles.nome}>{session.me?.user.full_name}</Text>
    <Text style={styles.cargo}>{roleNames[member.role]??member.role}</Text>
    <Card title="Dados da conta"><Text style={ui.text}>{session.me?.user.email}</Text><Text style={ui.text}>{workspace.organization.name}</Text>
      {workspace.schools.map(school=><Text key={school.id} style={ui.subdued}>{school.name}</Text>)}
    </Card>
    <Feedback error={action.error||session.error} loading={action.busy}/>
    {notice&&<Text accessibilityRole="alert" style={ui.text}>{notice}</Text>}
    <Action title="Editar nome" variant="flat" onPress={()=>setEdit(!edit)}/>
    {edit&&<Panel><Field label="Nome completo" value={name} onChangeText={setName} maxLength={160}/>
      <Action title="Salvar nome" disabled={action.busy||!name.trim()} onPress={()=>void action.run(async()=>{await api.profile(name.trim());await session.revalidate();setNotice("Nome atualizado.");setEdit(false);})}/>
    </Panel>}
    <Action title="Alterar senha" variant="flat" onPress={()=>setChange(!change)}/>
    {change&&<Panel><Field label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry/><Field label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry/>
      <Field label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry/>
      <Action title="Confirmar alteração" disabled={action.busy} onPress={()=>void action.run(async()=>{
        if(!current||password.length<12||password!==confirm)throw new Error("Preencha a senha atual e confirme uma nova senha de pelo menos 12 caracteres.");
        await api.changePassword({current_password:current,password,password_confirmation:confirm});
        setPassword("");setConfirm("");setCurrent("");await session.signOut();
      })}/>
    </Panel>}
    <Action title="Trocar escola" variant="flat" onPress={()=>router.push("/contexto")}/>
    <Action title="Sair da conta" variant="danger" disabled={action.busy} onPress={()=>void session.signOut()}/>
  </Page>;
}
