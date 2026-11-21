import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#163352", alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(8, 19, 27, 0.48)" },
  brand: { width: "100%", alignItems: "center", padding: 16 },
  logo: { width: 310, maxWidth: "84%", height: 116 },
  tagline: { marginTop: 0, color: "#FFFFFF", fontSize: 12, fontWeight: "700", textAlign: "center" },
  feedback: { width: "100%", maxWidth: 320, gap: 12, padding: 16, marginTop: 16, borderRadius: 12, backgroundColor: "#163352" },
  error: { color: "#FFFFFF", textAlign: "center", fontSize: 14 },
  track: { position: "absolute", bottom: "18%", width: 155, height: 3, backgroundColor: "#CFDFC2", borderRadius: 3 },
  fill: { height: "100%", backgroundColor: "#456C5B", borderRadius: 3 },
});
