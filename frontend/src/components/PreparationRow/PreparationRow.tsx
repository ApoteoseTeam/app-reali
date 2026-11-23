import { View, Text } from "react-native"
import { Chip } from "../Chip/Chip"
import { styles } from "./styles"

type Props = {
  refeicao: string
  preparacoes: string[]
}

export const PreparationRow = ({ refeicao, preparacoes }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.snack}>{refeicao}</Text>

      <View style={styles.preparations}>
        {preparacoes.map((preparacao, index) => (
          <Chip key={index} texto={preparacao} />
        ))}
      </View>
    </View>
  )
}