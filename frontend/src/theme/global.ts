import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },

  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },

  subtitle: {
    fontSize: typography.sizes.subtitle,
    color: colors.textSecondary,
  },

  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
  },
});
