
import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#E6F0DF",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  opcao: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  opcaoAtiva: {
    backgroundColor: colors.primary,
  },
  texto: {
    fontSize: 14,
    color: colors.primary,
  },
  textoAtivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
})