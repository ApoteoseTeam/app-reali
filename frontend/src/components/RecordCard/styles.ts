import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
    card: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.surface,
        borderRadius: 12,
        backgroundColor: colors.background,
    },

    data: {
        width: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#E6F2DA',
    },

    dia: {
        fontSize: 18,
        fontWeight: typography.weights.bold,
        color: colors.secondary,
    },

    mes: {
        fontSize: 12,
        color: '#44544B',
    },

    conteudo: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 130,
        gap: 4,
    },

    refeicao: {
        fontSize: 14,
        fontWeight: typography.weights.bold,
        color: '#1E2B25',
    },

    resumo: {
        fontSize: 12,
        lineHeight: 17,
        color: '#44544B',
    },

    indicador: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },

    acoes: {
        flexDirection: 'row',
        gap: 4,
        marginLeft: 'auto',
    },

    botaoEditar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6F2DA',
    },

    botaoExcluir: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FCE4DE',
    },
});