import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
  intro: { gap: 4 },
  title: { color: colors.primary, fontSize: 19, fontWeight: "700" },
  caption: { color: "#455A50", fontSize: 13, lineHeight: 19 },
  filters: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: "#DDE8D7", borderRadius: 10, padding: 12, gap: 10,
  },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { flex: 1, flexBasis: 130 },
  fieldInput: {
    minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: "#718B78", paddingHorizontal: 10,
    backgroundColor: colors.white, color: colors.primary,
  },
  summary: { gap: 8 },
  expand: {
    minHeight: 44, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#EEF5E9",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  expandText: { color: colors.secondaryDark, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  highlights: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  highlight: { flex: 1, flexBasis: 136, padding: 10, gap: 4, borderRadius: 9, backgroundColor: colors.secondary },
  highlightLabel: { color: colors.white, fontSize: 12, lineHeight: 17 },
  highlightValue: { color: colors.white, fontSize: 22, fontWeight: "700" },
  date: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  record: { backgroundColor: colors.surfaceLight, borderWidth: 0, borderRadius: 10, gap: 6, padding: 12 },
  totals: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  total: { flexGrow: 1, flexBasis: 96, gap: 1 },
  totalValue: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  recordSection: { gap: 8 },
  chartRow: { gap: 5 },
  chartTrack: { backgroundColor: "#E9EFE7", borderRadius: 4, height: 8 },
  chartValue: { backgroundColor: colors.secondary, borderRadius: 4, height: 8 },
  exportActions: { flexDirection: "row", gap: 8 },
  exportButton: { flex: 1 },
});
