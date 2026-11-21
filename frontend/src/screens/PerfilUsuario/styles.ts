import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
  perfilTopo: { marginTop: -16, marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  fundoTopo: {
    position: "absolute", top: 0, left: 0, right: 0, height: 72, backgroundColor: colors.primary,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  avatarArea: { alignSelf: "center", alignItems: "center", gap: 8, width: "100%" },
  avatarContorno: { width: 108, height: 108, position: "relative", marginBottom: 2 },
  avatarBorda: {
    width: "100%", height: "100%", borderRadius: 54, borderWidth: 4, borderColor: colors.white,
    backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  editar: {
    position: "absolute", right: -5, bottom: -5, width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center",
  },
  desabilitado: { opacity: 0.65 },
  identidade: { gap: 2, alignItems: "center" },
  nome: { color: colors.primary, fontSize: 18, fontWeight: "700", textAlign: "center" },
  cargo: { color: "#455A50", fontSize: 13, textAlign: "center" },
  fotoNota: { color: "#455A50", fontSize: 12, textAlign: "center" },
  linha: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44, borderRadius: 8 },
  icone: { width: 32, height: 32, backgroundColor: colors.background, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  linhaTexto: { color: colors.primary, fontSize: 14, flex: 1 },
  pressionado: { backgroundColor: colors.background },
  formulario: { gap: 8, marginBottom: 6 },
});
