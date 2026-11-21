import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { NoticeSummary } from "../../components/NoticeSummary/NoticeSummary";
import { Action, Feedback, Page, Panel, ui } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { useNotifications } from "../../notifications/provider";
import { useNotificationRefresh } from "../../notifications/useNotificationRefresh";
import { api, useSession } from "../../session/provider";

export default function Notificacoes() {
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
  useNotificationRefresh(list.refresh);
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
