
import { StyleSheet } from "react-native";

import { spacing } from "../../theme/spacing";

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 6,
  },

  content: {
    alignItems: "center",
    gap: 14,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E6F2DA",
    alignItems: "center",
    justifyContent: "center",
  },

  errorIconContainer: {
    backgroundColor: "#FCE6E0",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#102B53",
    textAlign: "center",
  },

  description: {
    fontSize: 13,
    color: "#64756B",
    textAlign: "center",
    lineHeight: 20,
  },

  loadingText: {
    fontSize: 13,
    color: "#315F52",
    textAlign: "center",
  },

  buttonContainer: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },

  primaryButton: {
    width: "100%",
    minHeight: 44,
    backgroundColor: "#19375B",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },

  secondaryButton: {
    width: "100%",
    minHeight: 44,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#19375B",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },

  secondaryButtonText: {
    color: "#19375B",
  },
});
