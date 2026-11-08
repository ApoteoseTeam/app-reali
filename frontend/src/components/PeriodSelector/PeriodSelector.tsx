import { Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { IconButton } from '../IconButton/IconButton';
import { colors } from '../../theme/colors';
import { styles } from './styles';

type PeriodSelectorProps = {
    periodo: string;
    onAnterior: () => void;
    onProximo: () => void;
    labelAnterior?: string;
    labelProximo?: string;
};

export function PeriodSelector({ periodo, onAnterior, onProximo, labelAnterior = 'Período anterior', labelProximo = 'Próximo período',
}: PeriodSelectorProps) {
    return (
        <View style={styles.container}>
            <IconButton
                icon={ChevronLeft}
                onPress={onAnterior}
                accessibilityLabel={labelAnterior}
                color={colors.secondary}
                size={20}
                style={styles.botao}
            />

            <Text
                style={styles.periodo}
                accessibilityLiveRegion="polite"
            >
                {periodo}
            </Text>

            <IconButton
                icon={ChevronRight}
                onPress={onProximo}
                accessibilityLabel={labelProximo}
                color={colors.secondary}
                size={20}
                style={styles.botao}
            />
        </View>
    );
}