import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"
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
    backgroundColor: "#E7F2D9",
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 18,
    paddingHorizontal: 18,
  },

  logo: {
    fontSize: 30,
    fontWeight: typography.weights.bold,
    color: "#315E52",
    letterSpacing: -0.8,
  },

  logoDestaque: {
    color: "#3D821C",
  },

  subtitulo: {
    marginTop: 5,
    fontSize: 11,
    color: "#52665C",
    textAlign: "center",
  },

  abas: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D7E4CC",
  },

  aba: {
    flex: 1,
    minHeight: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  abaSelecionada: {
    borderBottomColor: "#315E52",
  },

  textoAba: {
    fontSize: 15,
    color: "#60746A",
  },

  textoAbaSelecionada: {
    color: "#315E52",
    fontWeight: typography.weights.bold,
  },

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

  grupoSenha: {
    marginBottom: spacing.xs,
  },

  label: {
    marginBottom: 6,
    fontSize: typography.sizes.small,
    fontWeight: "600",
    color: "#315E52",
  },

  input: {
    ...globalStyles.input,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#B4D1A5",
    backgroundColor: colors.background,
    color: "#263B32",
    fontSize: 14,
  },

  inputErro: {
    borderColor: colors.error,
    backgroundColor: "#FFFFFF",
  },

  ajuda: {
    marginTop: 6,
    fontSize: 11,
    color: "#60746A",
  },

  textoErro: {
    color: colors.error,
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
    backgroundColor: "#315E52",
    justifyContent: "center",
  },

  nota: {
    marginTop: 12,
    fontSize: 11,
    color: "#6C7D73",
    textAlign: "center",
    lineHeight: 16,
  },
})