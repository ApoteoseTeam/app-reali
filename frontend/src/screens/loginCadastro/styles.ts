import { StyleSheet } from "react-native"
import { spacing } from "../../theme/spacing"
import { typography } from "../../theme/typography"
import { globalStyles } from "../../theme/global"

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  conteudo: {
    flex: 1,
  },

  cabecalho: {
    backgroundColor: "#14385F",
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 18,
  },

  logo: {
    fontSize: 34,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },

  logoDestaque: {
    color: "#FFFFFF",
  },

  subtitulo: {
    marginTop: 8,
    fontSize: 11,
    color: "#FFFFFF",
    textAlign: "center",
  },

  abas: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E3E8E5",
  },

  aba: {
    flex: 1,
    minHeight: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  abaSelecionada: { borderBottomColor: "#2F6B3A" },
  textoAba: { fontSize: 13, color: "#667B70" },
  textoAbaSelecionada: { color: "#14385F", fontWeight: typography.weights.bold },
  instrucao: { color: "#465950", fontSize: 14, lineHeight: 21, marginBottom: 8 },

  paginas: {
    flex: 1,
  },

  formulario: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: spacing.xl,
  },

  grupo: {
    marginBottom: 14,
  },

  label: {
    marginBottom: 6,
    fontSize: typography.sizes.small,
    fontWeight: "700",
    color: "#14385F",
  },

  input: {
    ...globalStyles.input,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#2F6B3A",
    backgroundColor: "#F5F9F1",
    color: "#14385F",
    fontSize: 14,
  },

  termos: {
    marginTop: 10,
    marginBottom: 10,
  },

  botao: {
    ...globalStyles.button,
    minHeight: 46,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#14385F",
    justifyContent: "center",
  },

  recuperar: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
    marginTop: 4,
  },
  recuperarTexto: { color: "#14385F", fontSize: 12, fontWeight: "600", textDecorationLine: "underline" },

  nota: {
    marginTop: 12,
    fontSize: 11,
    color: "#667B70",
    textAlign: "center",
    lineHeight: 16,
  },
});
