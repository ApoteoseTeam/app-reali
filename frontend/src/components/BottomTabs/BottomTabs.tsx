import { View, Text } from "react-native";
import { House, ClipboardList, LayoutDashboard, UserRound } from "lucide-react-native";
import { styles } from "./styles";
import { IconButton } from "../IconButton/IconButton";

type FooterProps = {
  activeTab?: "home" | "formulario" | "dashboard" | "perfil";

  onHomePress?: () => void;
  onFormularioPress?: () => void;
  onDashboardPress?: () => void;
  onPerfilPress?: () => void;
};

export const BottomTabs = ({
  activeTab = "home",
  onHomePress,
  onFormularioPress,
  onDashboardPress,
  onPerfilPress,

}: FooterProps) => {

  return (
    <View style={styles.footer}>

      <View style={styles.item}>
        <IconButton
          icon={House}
          onPress={onHomePress ?? (() => { })}
          color={activeTab === "home" ? "#315E50" : "#718078"}
          size={20}
          accessibilityLabel="Home"
          style={styles.iconButton}
        />

        <Text style={[styles.label, activeTab === "home" && styles.activeLabel]}>Home</Text>
      </View>

      <View style={styles.item}>
        <IconButton
          icon={ClipboardList}
          onPress={onFormularioPress ?? (() => { })}
          color={activeTab === "formulario" ? "#315E50" : "#718078"}
          size={20}
          accessibilityLabel="Formulário"
          style={styles.iconButton}
        />

        <Text style={[styles.label, activeTab === "formulario" && styles.activeLabel]}>Formulário</Text>

      </View>

      <View style={styles.item}>
        <IconButton
          icon={LayoutDashboard}
          onPress={onDashboardPress ?? (() => { })}
          color={activeTab === "dashboard" ? "#315E50" : "#718078"}
          size={20}
          accessibilityLabel="Dashboard"
          style={styles.iconButton}
        />

        <Text style={[styles.label, activeTab === "dashboard" && styles.activeLabel]} >Dashboard</Text>

      </View>

      <View style={styles.item}>
        <IconButton
          icon={UserRound}
          onPress={onPerfilPress ?? (() => { })}
          color={activeTab === "perfil" ? "#315E50" : "#718078"}
          size={20}
          accessibilityLabel="Perfil"
          style={styles.iconButton}
        />

        <Text style={[styles.label, activeTab === "perfil" && styles.activeLabel]}>Perfil</Text>

      </View>

    </View>
  )

}
