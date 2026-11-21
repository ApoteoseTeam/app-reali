import { Linking, Switch, Text, View } from "react-native";
import type { NoticeChannel, NoticePreference } from "../../api/reali";
import { Action, Feedback, Page, Panel, ui } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { useNotifications } from "../../notifications/provider";
import { api, useSession } from "../../session/provider";
import { styles } from "./styles";

const channels: { key: NoticeChannel; label: string; enabled: (row: NoticePreference) => boolean }[] = [
  { key: "in_app", label: "Central do aplicativo", enabled: () => true },
  { key: "push", label: "Push", enabled: row => row.push_available },
  { key: "email", label: "E-mail", enabled: row => row.email_available },
];

export default function PreferenciasNotificacoes() {
  const { workspace } = useSession();
  const { status, enable, disable } = useNotifications();
  const scope = workspace!.scope;
  const settings = useRemote("notice-preferences", signal => api.noticePreferences(scope, signal));
  const action = useAction();
  const toggle = (type: string, channel: NoticeChannel, value: boolean) => void action.run(async () => {
    await api.setNoticePreference(scope, type, channel, value);
    settings.refresh();
  });
  return <Page title="Preferências de notificações" refresh={settings.refresh} refreshing={settings.loading}>
    <Panel title="Push neste dispositivo">
      {status === "unavailable" && <Text style={ui.subdued}>Push disponível em builds Android e iOS configurados.</Text>}
      {status === "active" && <Text style={ui.text}>Inscrição ativa. Escolha abaixo os tipos que deseja receber por push.</Text>}
      {status === "denied" && <>
        <Text style={ui.warning}>Permissão de notificações desativada no dispositivo.</Text>
        <Action title="Abrir configurações do dispositivo" variant="flat" onPress={() => void action.run(() => Linking.openSettings())} />
      </>}
      {(status === "error" || status === "invalid") && <Text style={ui.error}>O serviço push está indisponível. Tente novamente.</Text>}
      {status !== "unavailable" && <Action title={status === "active" ? "Desativar push neste dispositivo" : "Ativar push neste dispositivo"}
        disabled={status === "loading"} onPress={() => void (status === "active" ? disable() : enable())} />}
    </Panel>
    <Feedback loading={settings.loading} error={settings.error ?? action.error} retry={settings.refresh} />
    {settings.data?.map(item => <Panel key={item.notification_type} title={item.label}>
      {channels.filter(channel => channel.enabled(item)).map(({ key, label }) => {
        const required = key === "in_app" && item.required_in_app;
        return <View key={key} style={styles.setting}>
          <Text style={ui.text}>{label}{required ? " (obrigatória)" : ""}</Text>
          <Switch accessibilityLabel={`${label} para ${item.label}`} value={item[key]}
            disabled={action.busy || settings.loading || required}
            onValueChange={value => toggle(item.notification_type, key, value)} />
        </View>;
      })}
    </Panel>)}
  </Page>;
}
