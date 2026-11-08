import { View, Text } from "react-native"
import { PreparationRow } from "../PreparationRow/PreparationRow"
import { globalStyles } from "../../theme/global"
import { styles } from "./styles"

type Refeicao = {
  nome: string
  preparacoes: string[]
}

type Props = {
  dia: string
  refeicoes: Refeicao[]
}

export const MenuDayCard = ({ dia, refeicoes }: Props) => {
  return (
    <View style={[globalStyles.cardContainer, styles.container]}>
      <Text style={styles.dia}>{dia}</Text>

      {refeicoes.map((refeicao, index) => (
        <PreparationRow
          key={index}
          refeicao={refeicao.nome}
          preparacoes={refeicao.preparacoes}
        />
      ))}
    </View>
  )
}