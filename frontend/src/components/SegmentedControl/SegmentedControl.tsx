import { View, Text, Pressable } from "react-native"
import { styles } from "./styles"

type Props = {
  opcoes: string[]
  selecionado: string
  aoSelecionar: (opcao: string) => void
}

export const SegmentedControl = ({
  opcoes,
  selecionado,
  aoSelecionar
}: Props) => {
  return (
    <View style={styles.container}>
      {opcoes.map((opcao) => {
        const ativo = selecionado === opcao

        return (
          <Pressable
            key={opcao}
            onPress={() => aoSelecionar(opcao)}
            style={[
              styles.opcao,
              ativo && styles.opcaoAtiva
            ]}
          >
            <Text
              style={[
                styles.texto,
                ativo && styles.textoAtivo
              ]}
            >
              {opcao}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}