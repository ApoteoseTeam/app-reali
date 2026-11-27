import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
    balloon: {
        maxWidth: '88%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        gap: spacing.sm,
    },

    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#E6F2DA',
        borderBottomLeftRadius: 4,
    },

    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: colors.secondary,
        borderBottomRightRadius: 4,
    },

    message: {
        fontSize: 14,
        lineHeight: 20,
        color: '#1E2B25',
    },

    userMessage: {
        color: '#FFFFFF',
    },

    sourceBox: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D5E3CB',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    sourceText: {
        fontSize: typography.sizes.small,
        color: '#44544B',
    },
});
