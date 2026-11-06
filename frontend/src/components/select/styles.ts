import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: "100%",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  value: {
    color: "#0F172A",
    fontSize: 15,
  },

  placeholder: {
    color: colors.text,
    fontSize: 15,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    maxHeight: "70%",
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
  },

  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary,
  },

  optionText: {
    fontSize: 15,
    color: colors.text,
  },
});
