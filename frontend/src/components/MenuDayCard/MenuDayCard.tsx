import { View, Text } from "react-native"
import { styles } from "./styles"

type Refeicao = {
  nome: string
  preparacoes: string[]
}

type Props = {
  dia: string
  refeicoes: Refeicao[]
  variante?: 'cozinha';
  planejamento?: number;
}

export const MenuDayCard = ({ dia, refeicoes, variante, planejamento }: Props) => {

  if (variante === 'cozinha') {
    const destaque = planejamento !== undefined;
    const preparacoes = refeicoes
      .flatMap((refeicao) => refeicao.preparacoes)
      .join(', ');
      
    return (
      <View style={[styles.container, destaque && styles.emphasis]}>
        <Text style={[styles.day, destaque && styles.clearText]}>
          {dia}
        </Text>

        <Text style={[styles.preparations, destaque && styles.clearText]}>
          {preparacoes}
        </Text>

        <Text style={[styles.situation, destaque && styles.clearText]}>
          {destaque
            ? `Hoje · planejamento para ${planejamento.toLocaleString('pt-BR')} alunos`
            : 'Presença do dia ainda não informada'}
        </Text>
      </View>
    );
  }
}