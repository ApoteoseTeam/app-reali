import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
  title: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  intro: { gap: 4 },
  context: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: "#DDE8D7", borderRadius: 10, padding: 12, gap: 8,
  },
  field: {
    minHeight: 44, borderWidth: 1, borderColor: "#718B78", borderRadius: 8, paddingHorizontal: 10,
    backgroundColor: colors.white, color: colors.primary,
  },
  list: { gap: 8 },
  meal: { backgroundColor: colors.surfaceLight, borderRadius: 10, borderWidth: 0, padding: 12, gap: 8 },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealIdentity: { flex: 1, gap: 3 },
  mealLabel: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  meta: { color: "#455A50", fontSize: 13, lineHeight: 19 },
  time: { color: colors.secondaryDark, fontSize: 12, fontWeight: "700" },
  icon: { width: 34, height: 34, backgroundColor: colors.white, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  schedule: { backgroundColor: colors.secondary, borderWidth: 0, borderRadius: 10, padding: 12, gap: 8 },
  scheduleTitle: { color: colors.white, fontSize: 15, fontWeight: "700" },
  scheduleCaption: { color: "#EDF4EA", fontSize: 13, lineHeight: 19 },
});
