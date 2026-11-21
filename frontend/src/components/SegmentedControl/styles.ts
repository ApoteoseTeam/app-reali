import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#E6F0DF",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  opcao: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
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
  underline: { backgroundColor: colors.white, borderRadius: 0, padding: 0, gap: 0 },
  underlineOption: { minHeight: 44, borderRadius: 0, borderBottomWidth: 3, borderBottomColor: "#E4ECE2" },
  underlineSelected: { borderBottomColor: colors.secondary },
  underlineText: { color: colors.secondary, fontWeight: "700" },
})
