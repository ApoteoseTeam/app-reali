import { View } from "react-native"
import { styles } from "./styles"

type Props = {
  largura?: number
  altura?: number
}

export const Skeleton = ({ largura = 100, altura = 20 }: Props) => {
  return (
    <View
      style={[
        styles.skeleton,
        { width: largura, height: altura }
      ]}
    />
  )
}