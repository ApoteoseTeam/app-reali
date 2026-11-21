import { View, Text, Pressable } from "react-native"
import { styles } from "./styles"

type Props = {
  opcoes: string[]
  selecionado: string
  aoSelecionar: (opcao: string) => void
  variant?: "default" | "underline"
}

export const SegmentedControl = ({
  opcoes,
  selecionado,
  aoSelecionar,
  variant = "default",
}: Props) => {
  const underline = variant === "underline";
  return (
    <View style={[styles.container, underline && styles.underline]} accessibilityRole="tablist">
      {opcoes.map((opcao) => {
        const ativo = selecionado === opcao

        return (
          <Pressable
            key={opcao}
            onPress={() => aoSelecionar(opcao)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            aria-selected={ativo}
            style={[
              styles.opcao,
              underline && styles.underlineOption,
              ativo && (underline ? styles.underlineSelected : styles.opcaoAtiva)
            ]}
          >
            <Text
              style={[
                styles.texto,
                ativo && (underline ? styles.underlineText : styles.textoAtivo)
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
