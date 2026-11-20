import { objectId, type Notice } from "./reali";

export function noticeId(value: unknown) {
  if (typeof value !== "string") return null;
  try { return objectId(value); }
  catch { return null; }
}

export function pushNoticeId(data: unknown) {
  return data && typeof data === "object" && "notification_id" in data
    ? noticeId(data.notification_id) : null;
}

export function noticeDestination(notice: Notice, organization: string, school: string, can: (name: string) => boolean) {
  if (notice.organization !== organization || notice.school !== school) return null;
  const id = noticeId(notice.data.resource_id);
  if (notice.data.resource === "camera" && id && can("camera_status")) return { pathname: "/camera" as const, params: { id } };
  if (notice.data.resource === "meal" && id && can("meal_history")) return { pathname: "/servico" as const, params: { id } };
  if (notice.data.resource === "reports" && can("analytics_reports")) return { pathname: "/relatorio" as const };
  return null;
}

export async function enrollPush(options: {
  signal?: AbortSignal;
  permission: () => Promise<boolean>;
  token: () => Promise<string>;
  register: (token: string) => Promise<void>;
}) {
  if (options.signal?.aborted) return "cancelled";
  const allowed = await options.permission();
  if (options.signal?.aborted) return "cancelled";
  if (!allowed) return "denied";
  const token = await options.token();
  if (options.signal?.aborted) return "cancelled";
  if (!/^(?:ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{8,200}\]$/.test(token)) return "invalid";
  await options.register(token);
  return options.signal?.aborted ? "cancelled" : "active";
}
