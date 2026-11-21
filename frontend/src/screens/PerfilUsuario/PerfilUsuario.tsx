import { useState } from "react";
import { useRouter } from "expo-router";
import { Building2, ChevronRight, KeyRound, Mail, PencilLine, School, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { roleNames } from "../../api/reali";
import { Action, Feedback, Field, Page, Panel, ui } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { api, useSession } from "../../session/provider";
import { colors } from "../../theme/colors";
import { ProfileAvatar } from "./ProfileAvatar";
import { styles } from "./styles";

function ProfileRow({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress?: () => void }) {
  const content = <>
    <View style={styles.icone}><Icon size={17} color={colors.primary} /></View>
    <Text style={styles.linhaTexto}>{label}</Text>
    {onPress && <ChevronRight size={18} color={colors.primary} />}
  </>;
  if (onPress) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.linha, pressed && styles.pressionado]}>{content}</Pressable>;
  }
  return <View style={styles.linha}>{content}</View>;
}

export default function PerfilUsuario() {
  const session = useSession();
  const workspace = session.workspace!;
  const member = workspace.member;
  const router = useRouter();
  const [name,setName] = useState(session.me?.user.full_name ?? "");
  const [current,setCurrent] = useState("");
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [edit,setEdit] = useState(false);
  const [change,setChange] = useState(false);
  const [notice,setNotice] = useState("");
  const action = useAction();

  return (
    <Page management title="Meu perfil" footer={
      <Action title="Sair da conta" variant="primary" disabled={action.busy} onPress={() => void session.signOut()} />
    }>
      {session.me && (
        <View style={styles.perfilTopo}>
          <View pointerEvents="none" style={styles.fundoTopo} />
          <ProfileAvatar key={session.me.user.id} userId={session.me.user.id}
            name={session.me.user.full_name} role={roleNames[member.role] ?? member.role} />
        </View>
      )}
      <Panel title="Dados da conta">
        {session.me?.user.email ? <ProfileRow icon={Mail} label={session.me.user.email} /> : null}
        <ProfileRow icon={Building2} label={workspace.organization.name} />
        {workspace.schools.map(school => <ProfileRow key={school.id} icon={School} label={school.name} />)}
      </Panel>

      <Panel title="Configurações">
        <ProfileRow icon={PencilLine} label="Editar nome" onPress={() => setEdit(!edit)} />
        {edit && (
          <View style={styles.formulario}>
            <Field label="Nome completo" value={name} onChangeText={setName} maxLength={160} />
            <Action title="Salvar nome" variant="primary" disabled={action.busy || !name.trim()}
              onPress={() => void action.run(async () => {
                await api.profile(name.trim());
                await session.revalidate();
                setNotice("Nome atualizado.");
                setEdit(false);
              })} />
          </View>
        )}
        <ProfileRow icon={KeyRound} label="Alterar senha" onPress={() => setChange(!change)} />
        {change && (
          <View style={styles.formulario}>
            <Field label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry />
            <Field label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry />
            <Field label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry />
            <Action title="Confirmar alteração" variant="primary" disabled={action.busy} onPress={() => void action.run(async () => {
              if (!current || password.length < 12 || password !== confirm) {
                throw new Error("Preencha a senha atual e confirme uma nova senha de pelo menos 12 caracteres.");
              }
              await api.changePassword({ current_password: current, password, password_confirmation: confirm });
              setPassword("");
              setConfirm("");
              setCurrent("");
              await session.signOut();
            })} />
          </View>
        )}
        <ProfileRow icon={School} label="Trocar escola" onPress={() => router.push("/contexto")} />
      </Panel>
      <Feedback error={action.error || session.error} loading={action.busy} />
      {notice ? <Text accessibilityRole="alert" style={ui.text}>{notice}</Text> : null}
    </Page>
  );
}
