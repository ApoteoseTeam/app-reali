import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F7ED" },
  scroll: { flexGrow: 1, alignItems: "center" },
  surface: { flex: 1, width: "100%", maxWidth: 540, backgroundColor: "#F6FAF1", overflow: "hidden" },
  topShape: {
    position: "absolute", top: -96, left: -69, width: 252, height: 213,
    backgroundColor: "#173556", borderRadius: 135,
  },
  content: {
    flex: 1, minHeight: 412, width: "100%", maxWidth: 398, alignSelf: "center", alignItems: "center",
    justifyContent: "center", paddingHorizontal: 36, paddingTop: 78, paddingBottom: 12, gap: 28,
  },
  brand: { width: "100%", alignItems: "center" },
  logo: { width: "100%", maxWidth: 310, height: 112 },
  tagline: { color: "#173556", fontSize: 12, fontWeight: "700", textAlign: "center" },
  description: { maxWidth: 310, color: "#243831", fontSize: 15, lineHeight: 22, textAlign: "center" },
  enter: {
    width: "100%", minHeight: 48, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
    alignItems: "center", justifyContent: "center", backgroundColor: "#173556",
  },
  enterText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  art: { width: "100%", marginTop: 18, position: "relative", overflow: "hidden" },
  wave: {
    position: "absolute", left: "-15%", bottom: -72, width: "135%", height: "105%",
    borderTopStartRadius: 260, borderTopEndRadius: 170, borderTopWidth: 16, borderTopColor: "#173556",
    backgroundColor: "#B6CFAA", transform: [{ rotate: "-6deg" }],
  },
  plate: { position: "absolute", width: "88%", height: "138%", right: "-7%", bottom: "-42%" },
});
