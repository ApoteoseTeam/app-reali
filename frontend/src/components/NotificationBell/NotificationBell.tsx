import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { IconButton } from "../IconButton/IconButton";
import { useRemote } from "../../hooks/useRemote";
import { useNotificationRefresh } from "../../notifications/useNotificationRefresh";
import { api, useSession } from "../../session/provider";

const noticeStyle = StyleSheet.create({
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 1, right: 0, backgroundColor: "#D99426", borderRadius: 10,
    minWidth: 18, height: 18, textAlign: "center", paddingHorizontal: 3, color: "#102B53",
    fontSize: 11, fontWeight: "700" },
});

export function NotificationBell({ color = "#102B53" }: { color?: string }) {
  const { workspace } = useSession();
  const router = useRouter();
  const school = workspace?.school?.id;
  const count = useRemote("notice-count",
    signal => api.unreadNotices(workspace!.scope, school!, signal), Boolean(school), 60000);
  useNotificationRefresh(count.refresh);
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
