import { StyleSheet } from "react-native"
import { colors as coresGlobais } from "../../theme/colors"

export const colors = {
  info: { fundo: "#F4F8F1", texto: coresGlobais.primary },
  alerta: { fundo: "#FFF4D6", texto: "#755A16" },
  erro: { fundo: "#F9E4DE", texto: coresGlobais.error },
  sucesso: { fundo: "#E5F1DA", texto: coresGlobais.success },
}

export const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    gap: 12,
  },

  conteudo: {
    flex: 1,
    gap: 4,
  },

  titulo: {
    fontSize: 15,
    fontWeight: "bold",
  },

  mensagem: {
    fontSize: 13,
    lineHeight: 19,
    color: coresGlobais.text,
  },
})