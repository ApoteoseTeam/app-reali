import { Text, View } from "react-native";
import {
  CalendarDays,
  ChartNoAxesColumn,
  History,
  House,
  UserRound,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { IconButton } from "../IconButton/IconButton";
import { styles } from "./styles";

type TabId = "home" | "relatorios" | "cardapios" | "historico" | "perfil";

type FooterProps = {
  activeTab?: TabId;

  showRelatorios?: boolean;
  showHistorico?: boolean;
  showPerfil?: boolean;

  onHomePress?: () => void;
  onRelatoriosPress?: () => void;
  onCardapiosPress?: () => void;
  onHistoricoPress?: () => void;
  onPerfilPress?: () => void;
};

const noop = () => {};

export const BottomTabs = ({
  activeTab = "home",
  showRelatorios = false,
  showHistorico = false,
  showPerfil = true,
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
      visible: true,
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
      {tabs.filter((tab) => tab.visible).map((tab) => {
        const isActive = activeTab === tab.id;
        const tabColor = isActive ? colors.surface : colors.white;

        return (
          <View key={tab.id} style={styles.item}>
            <IconButton
              icon={tab.icon}
              onPress={tab.onPress ?? noop}
              color={tabColor}
              size={20}
              accessibilityLabel={tab.label}
              style={styles.iconButton}
            />

            <Text
              style={[
                styles.label,
                isActive && styles.activeLabel,
                { color: tabColor },
              ]}
            >
              {tab.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};