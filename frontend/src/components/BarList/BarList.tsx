import { View, Text } from "react-native"
import { styles } from "./styles"

type Barra = {
  nome: string
  valor: number
}

type Props = {
  itens: Barra[]
  unidade?: string
}

export const BarList = ({ itens, unidade = "%" }: Props) => {
  const itensOrdenados = [...itens].sort((a, b) => b.valor - a.valor)

  const maiorValor = Math.max(0, ...itens.map((item) => item.valor))

  return (
    <View style={styles.container}>
      {itensOrdenados.map((item, index) => {
        const largura = maiorValor > 0
          ? (item.valor / maiorValor) * 100
          : 0

        return (
          <View key={index} style={styles.line}>
            <Text style={styles.name}>{item.nome}</Text>

            <View style={styles.barBackground}>
              <View
                style={[
                  styles.bar,
                  { width: `${largura}%` }
                ]}
              />
            </View>

            <Text style={styles.value}>
              {item.valor} {unidade}
            </Text>
          </View>
        )
      })}
    </View>
  )
}