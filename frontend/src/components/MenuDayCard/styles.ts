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

  day: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  emphasis: {
    backgroundColor: colors.secondary,
    borderColor: '#102B53',
    borderWidth: 3,
  },

  preparations: {
    color: '#102B53',
    fontSize: 14,
    fontWeight: '600',
  },

  situation: {
    color: '#102B53',
    fontSize: 12,
  },

  clearText: {
    color: '#FFFFFF',
  },
})