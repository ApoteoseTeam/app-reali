import { StyleSheet } from "react-native";

export const stylesInicializacao = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: 285, maxWidth: "85%", height: 102 },
  subtitle: { color: "#14385F", fontSize: 12, fontWeight: "700", textAlign: "center" },
  track: { width: 150, height: 3, marginTop: 26, backgroundColor: "#DCE7D3", borderRadius: 3 },
  fill: { width: "42%", height: "100%", backgroundColor: "#355D50", borderRadius: 3 },
  loadingText: { marginTop: 8, color: "#59645F", fontSize: 11 },
  error: { color: "#9B222A", textAlign: "center", marginVertical: 16 },
});
