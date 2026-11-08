import { View, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { styles, colors } from "./styles"

type Props = {
  tipo?: "info" | "alerta" | "erro" | "sucesso"
  titulo?: string
  mensagem: string
}

const icones = {
  info: "information-circle-outline",
  alerta: "warning-outline",
  erro: "alert-circle-outline",
  sucesso: "checkmark-circle-outline",
} as const

export function Banner({ tipo = "info", titulo, mensagem }: Props) {
  const cor = colors[tipo]

  return (
    <View style={[
      styles.banner,
      { backgroundColor: cor.fundo, borderColor: cor.texto }
    ]}>
      <Ionicons name={icones[tipo]} size={22} color={cor.texto} />

      <View style={styles.conteudo}>
        {titulo && (
          <Text style={[styles.titulo, { color: cor.texto }]}>
            {titulo}
          </Text>
        )}

        <Text style={styles.mensagem}>{mensagem}</Text>
      </View>
    </View>
  )
}