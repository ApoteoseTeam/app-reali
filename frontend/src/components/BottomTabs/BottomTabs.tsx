import { usePathname, useRouter } from "expo-router";
import { ClipboardList, History, House, TrendingUp, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../session/provider";
import { styles } from "./styles";

const tabs = [
  { href: "/inicio", label: "Início", icon: House, routes: ["/inicio"], capability: null },
  { href: "/relatorio", label: "Relatórios", icon: TrendingUp, routes: ["/relatorio"], capability: "indicators" },
  { href: "/merenda", label: "Merenda", icon: ClipboardList, routes: ["/merenda", "/servico"], capability: "meal_history" },
  { href: "/historico", label: "Histórico", icon: History, routes: ["/historico"], capability: "indicators" },
  { href: "/perfil", label: "Perfil", icon: UserRound, routes: ["/perfil"], capability: null },
] as const;

export function BottomTabs() {
  const { can } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(6, bottom) }]} accessibilityRole="tablist"
      accessibilityLabel="Navegação principal" testID="workspace-navigation">
      {tabs.filter(({ capability }) => !capability || can(capability)).map(({ href, label, icon: Icon, routes }) => {
        const selected = routes.some(route => route === pathname);
        const color = selected ? "#D9EACD" : "#FFFFFF";
        return (
          <Pressable key={href} testID={`nav-${href.slice(1)}`} accessibilityRole="tab" accessibilityLabel={label}
            accessibilityState={{ selected }} aria-selected={selected} onPress={() => { if (pathname !== href) router.navigate(href); }}
            style={({ pressed }) => [styles.item, selected && styles.selected, pressed && styles.pressed]}>
            <Icon size={20} color={color} />
            <Text numberOfLines={1} style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
