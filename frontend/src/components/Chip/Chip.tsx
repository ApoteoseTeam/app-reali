import { View, Text } from "react-native"
import { styles } from "./styles"

type Props = {
  texto: string
}

export const Chip = ({ texto }: Props) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  )
}