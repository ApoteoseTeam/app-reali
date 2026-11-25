import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"
import { spacing } from "../../theme/spacing"
import { typography } from "../../theme/typography"
import { globalStyles } from "../../theme/global"

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flex: 1,
  },

  
  header: {
    backgroundColor: "#14385F",
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 18,
  },

  logo: {
      width: 240,
      height: 120,
  },

  featuredLogo: {
    color: "#FFFFFF",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 11,
    color: "#FFFFFF",
    textAlign: "center",
  },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E3E8E5",
  },

  tab: {
    flex: 1,
    minHeight: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  selectedTab: {
    borderBottomColor: "#2F6B3A",
  },

  textTab: {
    fontSize: 13,
    color: "#667B70",
  },

  selectedTabText: {
    color: "#14385F",
    fontWeight: typography.weights.bold,
  },

  pages: {
    flex: 1,
  },

  form: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: spacing.xl,
  },

  group: {
    marginBottom: 14,
  },

  passwordGroup: {
    marginBottom: spacing.xs,
  },

  label: {
    marginBottom: 6,
    fontSize: typography.sizes.small,
    fontWeight: "700",
    color: "#14385F",
  },

  input: {
    ...globalStyles.input,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#2F6B3A",
    backgroundColor: "#F5F9F1",
    color: "#14385F",
    fontSize: 14,
  },

  inputWithEye: {
    paddingRight: 48,
  },

  passwordEye: {
    position: "absolute",
    right: 2,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  inputError: {
    borderColor: colors.error,
    backgroundColor: "#FFFFFF",
  },

  help: {
    marginTop: 6,
    fontSize: 11,
    color: "#667B70",
  },

  textError: {
    color: colors.error,
  },

  terms: {
    marginTop: 10,
    marginBottom: 10,
  },

  button: {
    ...globalStyles.button,
    minHeight: 46,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#14385F",
    justifyContent: "center",
  },

  note: {
    marginTop: 12,
    fontSize: 11,
    color: "#667B70",
    textAlign: "center",
    lineHeight: 16,
  },
}) 