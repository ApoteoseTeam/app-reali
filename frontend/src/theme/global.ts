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

  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    color: colors.background,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  
    input: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    fontSize: typography.sizes.body,
    color: colors.text,
  },
                                              
  checkboxContainer: {
  flexDirection: "row",
  alignItems: "center",
},

  checkboxBox: { 
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  checkboxText: {
    fontSize: typography.sizes.body,
    color: colors.text,
      marginLeft: 8,
    },

  checkboxChecked: {
  backgroundColor: colors.primary,
  },

  checkboxIcon: {
  color: colors.background,
  fontSize: typography.sizes.body,
  fontWeight: typography.weights.bold,
  lineHeight: 20,
  textAlign: "center",
  },

  cardContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border

  },

  cardTitle: { 
  fontSize: typography.sizes.title,
  fontWeight: typography.weights.bold,
  color: colors.primary

  },

  cardDescription: {
  fontSize: typography.sizes.subtitle,
  lineHeight: 26,
  marginTop: spacing.sm,
  color: colors.secondary
  },
});
