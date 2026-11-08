import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
    balao: {
        width: '100%',
        maxWidth: 290,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        gap: spacing.sm,
    },

    balaoAssistente: {
        alignSelf: 'flex-start',
        backgroundColor: '#E6F2DA',
        borderBottomLeftRadius: 4,
    },

    balaoUsuario: {
        alignSelf: 'flex-end',
        backgroundColor: colors.secondary,
        borderBottomRightRadius: 4,
    },

    mensagem: {
        fontSize: 14,
        lineHeight: 20,
        color: '#1E2B25',
    },

    mensagemUsuario: {
        color: '#FFFFFF',
    },

    caixaFonte: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D5E3CB',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    textoFonte: {
        fontSize: typography.sizes.small,
        color: '#44544B',
    },
});