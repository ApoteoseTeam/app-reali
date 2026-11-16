import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"
import { spacing } from "../../theme/spacing"

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

  cardContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border
  },
})