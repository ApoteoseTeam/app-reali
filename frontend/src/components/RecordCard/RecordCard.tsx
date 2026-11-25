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
            <View style={styles.date}>
                <Text style={styles.day}>{dia}</Text>
                <Text style={styles.month}>{mes}</Text>
            </View>

            <View style={styles.content}>
                <Text
                    style={styles.snack}
                    accessibilityRole="header"
                >
                    {refeicao}
                </Text>

                <Text style={styles.summary}>{resumo}</Text>

                {indicador ? (
                    <View style={styles.indicator}>
                        <Chip texto={indicador} />
                    </View>
                ) : null}
            </View>

            <View style={styles.actions}>
                <IconButton
                    icon={Pencil}
                    onPress={onEditar}
                    accessibilityLabel={`Editar ${refeicao} de ${dia} de ${mes}`}
                    color={colors.secondary}
                    size={18}
                    style={styles.editButton}
                />

                <IconButton
                    icon={Trash2}
                    onPress={onExcluir}
                    accessibilityLabel={`Excluir ${refeicao} de ${dia} de ${mes}`}
                    color={colors.error}
                    size={18}
                    style={styles.deleteButton}
                />
            </View>
        </Card>
    );
}