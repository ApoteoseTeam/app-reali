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

  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },

  activeOption: {
    backgroundColor: colors.primary,
  },

  text: {
    fontSize: 14,
    color: colors.primary,
  },

  activeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  }

})