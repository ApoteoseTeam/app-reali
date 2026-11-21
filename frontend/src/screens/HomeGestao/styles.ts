import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.primary },
  cabecalho: {
    minHeight: 56, paddingHorizontal: 16, backgroundColor: colors.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  logo: { width: 62, height: 56, marginLeft: -12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  perfil: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1, backgroundColor: colors.white },
  conteudo: {
    width: "100%", maxWidth: 640, alignSelf: "center", flexGrow: 1, padding: 16, paddingTop: 22, gap: 14,
  },
  saudacao: { gap: 2 },
  titulo: { color: colors.primary, fontSize: 25, fontWeight: "700" },
  escola: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 44, gap: 8 },
  textoSecundario: { color: "#455A50", fontSize: 13, lineHeight: 19, flexShrink: 1 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  secao: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  destaques: { gap: 9 },
  resumo: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, borderRadius: 10, padding: 13,
    backgroundColor: colors.background, borderWidth: 1, borderColor: "#DDE8D7",
  },
  dado: { flex: 1, minWidth: 95, gap: 3 },
  valor: { color: colors.primary, fontSize: 17, fontWeight: "700" },
  refeicao: {
    flexDirection: "row", alignItems: "center", minHeight: 62, padding: 12, gap: 8,
    borderRadius: 10, backgroundColor: colors.surfaceLight,
  },
  tituloRefeicao: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  aviso: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 9, backgroundColor: "#FFF3D5" },
  textoAviso: { color: "#624900", fontSize: 13, lineHeight: 18 },
  assistantDock: { backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#DCE7D7" },
  assistente: {
    width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 6,
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8,
  },
  balao: {
    flexShrink: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9,
    color: colors.primary, backgroundColor: colors.surfaceLight, fontSize: 13, fontWeight: "700",
  },
  botaoAssistente: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
});
