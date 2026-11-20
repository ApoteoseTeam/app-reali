import { useLocalSearchParams, useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Switch, Text, View } from "react-native";

import { noticeDestination, noticeId } from "../api/notificationActions";
import type { Notice, NoticeChannel, NoticePreference } from "../api/reali";
import { IconButton } from "../components/IconButton/IconButton";
import { useAction } from "../hooks/useAction";
import { useRemote } from "../hooks/useRemote";
import { useNotifications } from "../notifications/provider";
import { api, useSession } from "../session/provider";
import { Action, Feedback, Page, Panel, stamp, ui } from "./ui";

const noticeStyle = StyleSheet.create({
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 1, right: 0, backgroundColor: "#D99426", borderRadius: 10,
    minWidth: 18, height: 18, textAlign: "center", paddingHorizontal: 3, color: "#102B53",
    fontSize: 11, fontWeight: "700" },
  setting: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center", minHeight: 44 },
});
const priorities: Record<string, string> = { LOW: "Baixa", NORMAL: "Normal", HIGH: "Alta", CRITICAL: "Crítica" };

function useUpdated(refresh: () => void) {
  const { revision } = useNotifications();
  useEffect(() => { if (revision) refresh(); }, [revision, refresh]);
}

export function NotificationBell({ color = "#102B53" }: { color?: string }) {
  const { workspace } = useSession();
  const router = useRouter();
  const school = workspace?.school?.id;
  const count = useRemote("notice-count",
    signal => api.unreadNotices(workspace!.scope, school!, signal), Boolean(school), 60000);
  useUpdated(count.refresh);
  if (!school) return null;
  const value = count.data?.unread_count ?? 0;
  return <View style={noticeStyle.bell}>
    <IconButton icon={Bell} size={23} color={color} style={noticeStyle.bell}
      accessibilityLabel={value ? `Notificações, ${value} não lidas` : "Notificações"}
      onPress={() => router.push("/notificacoes")} />
    {value > 0 && <Text accessibilityElementsHidden importantForAccessibility="no"
      pointerEvents="none" style={noticeStyle.badge}>{value > 99 ? "99+" : value}</Text>}
  </View>;
}

export function NotificationCenter() {
  const { workspace } = useSession();
  const router = useRouter();
  const { invalidate } = useNotifications();
  const [archived, setArchived] = useState(false);
  const [unread, setUnread] = useState(false);
  const [selectType, setSelectType] = useState(false);
  const [type, setType] = useState<string>();
  const [page, setPage] = useState(1);
  const scope = workspace!.scope;
  const school_id = workspace!.school!.id;
  const filters = { school_id, archived, unread: unread || undefined, type, page };
  const list = useRemote(`notices/${archived}/${unread}/${type ?? ""}/${page}`,
    signal => api.notices(scope, filters, signal), true, 60000);
  const preferences = useRemote("notice-preferences", signal => api.noticePreferences(scope, signal));
  const action = useAction();
  useUpdated(list.refresh);
  const types = new Map(preferences.data?.map(item => [item.notification_type, item.label]));
  const updateFilter = (apply: () => void) => { apply(); setPage(1); };
  return <Page title="Notificações" refresh={list.refresh} refreshing={list.loading}>
    <View style={ui.row}>
      <Action title="Preferências" variant="flat" onPress={() => router.push("/preferencias-notificacoes")} />
      <Action title={archived ? "Voltar à caixa de entrada" : "Ver arquivadas"} variant="flat"
        onPress={() => updateFilter(() => { setArchived(!archived); setUnread(false); })} />
      <Action title={unread ? "Todas as notificações" : "Somente não lidas"} variant="flat"
        onPress={() => updateFilter(() => setUnread(!unread))} />
      <Action title={type ? types.get(type) ?? type : "Filtrar por tipo"} variant="flat" onPress={() => setSelectType(!selectType)} />
      {!archived && <Action title="Marcar todas como lidas" disabled={action.busy}
        onPress={() => void action.run(async () => {
          await api.readAllNotices(scope, school_id);
          setPage(1);
          invalidate();
        })} />}
    </View>
    {selectType && <Panel title="Tipo">
      <Action title="Todos os tipos" variant="flat" onPress={() => updateFilter(() => { setType(undefined); setSelectType(false); })} />
      <Feedback loading={preferences.loading} error={preferences.error} retry={preferences.refresh} />
      <View style={ui.row}>
        {preferences.data?.map(item => <Action key={item.notification_type} title={item.label} variant="flat"
          onPress={() => updateFilter(() => { setType(item.notification_type); setSelectType(false); })} />)}
      </View>
    </Panel>}
    <Feedback loading={list.loading} error={list.error ?? action.error} empty={list.data?.results.length === 0} retry={list.refresh} />
    {list.data?.results.map(item => <Panel key={item.id} title={item.title}>
      <NoticeSummary item={item} />
      <Action title="Abrir notificação" variant="flat" onPress={() => router.push({ pathname: "/notificacao", params: { id: item.id } })} />
    </Panel>)}
    {(page > 1 || list.data?.next) && <View style={ui.row}>
      {page > 1 && <Action title="Página anterior" variant="flat" onPress={() => setPage(page - 1)} />}
      {list.data?.next && <Action title="Próxima página" variant="flat" onPress={() => setPage(page + 1)} />}
    </View>}
  </Page>;
}

function NoticeSummary({ item }: { item: Notice }) {
  return <>
    <Text style={ui.text}>{item.message}</Text>
    <Text style={ui.subdued}>{item.type_label} · Prioridade {priorities[item.priority] ?? item.priority}</Text>
    <Text style={ui.subdued}>{item.school_name ?? "Organização"} · {stamp(item.created_at)}</Text>
    <Text style={item.read_at ? ui.subdued : ui.warning}>{item.read_at ? "Lida" : "Não lida"}</Text>
  </>;
}

export function NotificationDetail() {
  const { id: received } = useLocalSearchParams<{ id: string }>();
  const id = noticeId(received);
  const session = useSession();
  const router = useRouter();
  const { invalidate } = useNotifications();
  const action = useAction();
  const workspace = session.workspace!;
  const school = workspace.school!.id;
  const detail = useRemote(`notice/${id}`, signal => api.notice(workspace.scope, school, id!, signal), Boolean(id));
  const item = detail.data;
  const destination = item && noticeDestination(item, workspace.organization.id, school, session.can);
  const change = (mode: "read" | "archive") => void action.run(async () => {
    await api.updateNotice(workspace.scope, school, id!, mode);
    detail.refresh();
    invalidate();
  });
  return <Page title="Notificação" refresh={id ? detail.refresh : undefined} refreshing={detail.loading}>
    <Feedback loading={detail.loading} error={action.error ?? detail.error ?? (!id ? "Notificação inválida." : undefined)}
      retry={id ? detail.refresh : undefined} />
    {item && !detail.error && <Panel title={item.title}>
      <NoticeSummary item={item} />
      {!item.read_at && <Action title="Marcar como lida" disabled={action.busy} onPress={() => change("read")} />}
      {!item.archived_at && <Action title="Arquivar" variant="flat" disabled={action.busy} onPress={() => change("archive")} />}
      {destination && <Action title="Abrir recurso relacionado" variant="flat" onPress={() => router.push(destination)} />}
    </Panel>}
    <Action title="Abrir central de notificações" variant="flat" onPress={() => router.replace("/notificacoes")} />
  </Page>;
}

const channels: { key: NoticeChannel; label: string; enabled: (row: NoticePreference) => boolean }[] = [
  { key: "in_app", label: "Central do aplicativo", enabled: () => true },
  { key: "push", label: "Push", enabled: row => row.push_available },
  { key: "email", label: "E-mail", enabled: row => row.email_available },
];

export function NotificationPreferences() {
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
        return <View key={key} style={noticeStyle.setting}>
          <Text style={ui.text}>{label}{required ? " (obrigatória)" : ""}</Text>
          <Switch accessibilityLabel={`${label} para ${item.label}`} value={item[key]}
            disabled={action.busy || settings.loading || required}
            onValueChange={value => toggle(item.notification_type, key, value)} />
        </View>;
      })}
    </Panel>)}
  </Page>;
}
