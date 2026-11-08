import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 12,
    },

    botao: {
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 22,
        backgroundColor: '#E6F2DA',
        alignItems: 'center',
        justifyContent: 'center',
    },

    periodo: {
        flex: 1,
        textAlign: 'center',
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
        color: colors.secondary,
    },
});