import { Text, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';

import { Card } from '../Card/Card';
import { Chip } from '../Chip/Chip';
import { IconButton } from '../IconButton/IconButton';
import { colors } from '../../theme/colors';
import { styles } from './styles';

type RecordCardProps = {
    dia: string;
    mes: string;
    refeicao: string;
    resumo: string;
    indicador?: string;
    onEditar: () => void;
    onExcluir: () => void;
};

export function RecordCard({
    dia,
    mes,
    refeicao,
    resumo,
    indicador,
    onEditar,
    onExcluir,
}: RecordCardProps) {
    return (
        <Card style={styles.card}>
            <View style={styles.data}>
                <Text style={styles.dia}>{dia}</Text>
                <Text style={styles.mes}>{mes}</Text>
            </View>

            <View style={styles.conteudo}>
                <Text
                    style={styles.refeicao}
                    accessibilityRole="header"
                >
                    {refeicao}
                </Text>

                <Text style={styles.resumo}>{resumo}</Text>

                {indicador ? (
                    <View style={styles.indicador}>
                        <Chip texto={indicador} />
                    </View>
                ) : null}
            </View>

            <View style={styles.acoes}>
                <IconButton
                    icon={Pencil}
                    onPress={onEditar}
                    accessibilityLabel={`Editar ${refeicao} de ${dia} de ${mes}`}
                    color={colors.secondary}
                    size={18}
                    style={styles.botaoEditar}
                />

                <IconButton
                    icon={Trash2}
                    onPress={onExcluir}
                    accessibilityLabel={`Excluir ${refeicao} de ${dia} de ${mes}`}
                    color={colors.error}
                    size={18}
                    style={styles.botaoExcluir}
                />
            </View>
        </Card>
    );
}