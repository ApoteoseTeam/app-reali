import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  refeicao: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
  },

  preparacoes: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
})