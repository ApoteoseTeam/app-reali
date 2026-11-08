import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"

export const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nome: {
    width: 60,
    fontSize: 12,
    color: colors.text,
  },
  fundoBarra: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barra: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  valor: {
    width: 55,
    fontSize: 12,
    color: colors.text,
    textAlign: "right",
  },
})