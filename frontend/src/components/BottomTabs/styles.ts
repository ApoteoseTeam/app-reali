import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    width: "100%", backgroundColor: colors.primary, borderTopWidth: 1, borderTopColor: "#315879",
    paddingTop: 6, paddingHorizontal: 6,
  },
  item: { flex: 1, maxWidth: 130, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 9 },
  selected: { backgroundColor: "#26496B" },
  pressed: { opacity: 0.76 },
  label: { fontSize: 11, fontWeight: "600" },
});
