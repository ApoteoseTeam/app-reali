import { Pressable, Text, View } from "react-native";
import {
  CalendarDays,
  ChartNoAxesColumn,
  History,
  House,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { styles } from "./styles";

type TabId =
  | "home"
  | "relatorios"
  | "cardapios"
  | "historico"
  | "perfil";

type FooterProps = {
  activeTab?: TabId;

  showRelatorios?: boolean;
  showHistorico?: boolean;
  showPerfil?: boolean;
  showCardapios?: boolean;

  onHomePress?: () => void;
  onRelatoriosPress?: () => void;
  onCardapiosPress?: () => void;
  onHistoricoPress?: () => void;
  onPerfilPress?: () => void;
};

export const BottomTabs = ({
  activeTab = "home",
  showRelatorios = false,
  showHistorico = false,
  showPerfil = true,
  showCardapios = true,
  onHomePress,
  onRelatoriosPress,
  onCardapiosPress,
  onHistoricoPress,
  onPerfilPress,
}: FooterProps) => {
  const tabs = [
    {
      id: "home",
      label: "Início",
      icon: House,
      visible: true,
      onPress: onHomePress,
    },
    {
      id: "relatorios",
      label: "Relatórios",
      icon: ChartNoAxesColumn,
      visible: showRelatorios,
      onPress: onRelatoriosPress,
    },
    {
      id: "cardapios",
      label: "Cardápio",
      icon: CalendarDays,
      visible: showCardapios,
      onPress: onCardapiosPress,
    },
    {
      id: "historico",
      label: "Histórico",
      icon: History,
      visible: showHistorico,
      onPress: onHistoricoPress,
    },
    {
      id: "perfil",
      label: "Perfil",
      icon: UserRound,
      visible: showPerfil,
      onPress: onPerfilPress,
    },
  ];

  return (
    <View style={styles.footer}>
      {tabs
        .filter((tab) => tab.visible && tab.onPress)
        .map((tab) => {
          const isActive = activeTab === tab.id;
          const tabColor = isActive ? colors.surface : colors.white;

          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.id}
              style={styles.item}
              onPress={tab.onPress}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <Icon color={tabColor} size={20} />

              <Text
                style={[
                  styles.label,
                  isActive && styles.activeLabel,
                  { color: tabColor },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
};