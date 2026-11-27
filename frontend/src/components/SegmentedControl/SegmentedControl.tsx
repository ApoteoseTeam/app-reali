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
              styles.option,
              ativo && styles.activeOption
            ]}
          >
            <Text
              style={[
                styles.text,
                ativo && styles.activeText
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