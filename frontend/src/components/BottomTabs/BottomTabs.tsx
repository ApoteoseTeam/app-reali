import { View, Text } from "react-native";
import { House, UserRound } from "lucide-react-native";
import { styles } from "./styles";
import { IconButton } from "../IconButton/IconButton";

type FooterProps = {
  activeTab?: "home" | "perfil";

  onHomePress?: () => void;
  onPerfilPress?: () => void;
};

export const BottomTabs = ({
  activeTab = "home",
  onHomePress,
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