import { useEffect } from "react";
import { useNotifications } from "./provider";

export function useNotificationRefresh(refresh: () => void) {
  const { revision } = useNotifications();
  useEffect(() => { if (revision) refresh(); }, [revision, refresh]);
}
