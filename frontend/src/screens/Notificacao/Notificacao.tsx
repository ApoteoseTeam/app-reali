import { useLocalSearchParams, useRouter } from "expo-router";
import { noticeDestination, noticeId } from "../../api/notificationActions";
import { NoticeSummary } from "../../components/NoticeSummary/NoticeSummary";
import { Action, Feedback, Page, Panel } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { useNotifications } from "../../notifications/provider";
import { api, useSession } from "../../session/provider";

export default function Notificacao() {
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
