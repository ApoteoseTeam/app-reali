import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: spacing.md,
        gap: spacing.sm,
    },
    headerTitle: {
        color: colors.white,
        fontSize: 20,
        fontWeight: '700',
    },
    school: {
        fontSize: 14,
        color: colors.secondary,
        marginBottom: spacing.xs,
    },
    indicators: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginVertical: spacing.sm,
    },
    indicator: {
        flex: 1,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
    },
    recordDetail: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: spacing.xs,
    },
    message: {
        fontSize: 14,
        color: colors.primary,
        textAlign: 'center',
        marginVertical: spacing.sm,
    },
});
