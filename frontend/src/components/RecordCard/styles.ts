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

    date: {
        width: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#E6F2DA',
    },

    day: {
        fontSize: 18,
        fontWeight: typography.weights.bold,
        color: colors.secondary,
    },

    month: {
        fontSize: 12,
        color: '#44544B',
    },

    content: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 130,
        gap: 4,
    },

    snack: {
        fontSize: 14,
        fontWeight: typography.weights.bold,
        color: '#1E2B25',
    },

    summary: {
        fontSize: 12,
        lineHeight: 17,
        color: '#44544B',
    },

    indicator: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },

    actions: {
        flexDirection: 'row',
        gap: 4,
        marginLeft: 'auto',
    },

    editButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6F2DA',
    },

    deleteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FCE4DE',
    },
});