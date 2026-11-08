import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },

  dia: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
})