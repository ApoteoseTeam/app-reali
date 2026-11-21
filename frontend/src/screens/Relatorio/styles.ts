import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
  filtros: { gap: 8 },
  relatorio: {
    backgroundColor: colors.white, borderColor: "#DCE7D7", borderWidth: 1, borderRadius: 12, padding: 16, gap: 10,
  },
  refeicao: { backgroundColor: colors.surfaceLight, borderWidth: 0, borderRadius: 10, padding: 14, gap: 8 },
  marca: { width: 72, height: 32, alignSelf: "flex-start" },
  tituloRelatorio: { color: colors.primary, fontSize: 17, fontWeight: "700" },
  info: { color: "#42564D", fontSize: 13, lineHeight: 19 },
  indicadores: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  indicador: { flexGrow: 1, flexBasis: 138 },
  subtitulo: { color: colors.secondaryDark, fontSize: 14, fontWeight: "700" },
  qualidade: { backgroundColor: colors.background, padding: 10, gap: 4, borderRadius: 8 },
  acoes: { flexDirection: "row", gap: 7 },
  botao: {
    flex: 1, minHeight: 44, paddingHorizontal: 4, paddingVertical: 9, justifyContent: "center", alignItems: "center",
    borderRadius: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary,
  },
  botaoSecundario: { backgroundColor: colors.white },
  textoBotao: { fontSize: 12, textAlign: "center" },
  textoSecundario: { color: colors.primary, fontSize: 12, textAlign: "center" },
  desabilitado: { opacity: 0.5 },
  comparacao: { color: colors.secondaryDark, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  diario: {
    gap: 8, padding: 12, borderRadius: 8, marginTop: 4, backgroundColor: colors.white,
    borderWidth: 1, borderColor: "#DDE8D8",
  },
  rotuloDiario: { color: colors.secondaryDark, fontSize: 14, fontWeight: "700" },
  inputDiario: {
    minHeight: 44, backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 12, color: colors.white,
  },
  ajudaDiario: { color: "#42564D", fontSize: 12, lineHeight: 17 },
  cardMargem: { padding: 10, gap: 4, borderWidth: 0, borderRadius: 8, backgroundColor: colors.surfaceLight },
  tituloMargem: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  inputExtras: {
    minHeight: 44, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surface, borderRadius: 8,
    paddingHorizontal: 12, color: colors.primary,
  },
  totalDiario: { marginTop: 4, padding: 11, borderRadius: 8, backgroundColor: colors.secondary },
  totalLegenda: { color: colors.white, fontSize: 13 },
  totalValor: { color: colors.white, fontSize: 22, fontWeight: "700" },
  salvarDiario: {
    marginTop: 4, minHeight: 44, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, borderRadius: 8,
  },
});
