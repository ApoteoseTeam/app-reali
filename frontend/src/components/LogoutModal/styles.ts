import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    container: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        gap: 16,
    },

        iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FBE2DB',
        justifyContent: 'center',
        alignItems: 'center',
    },

    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
        textAlign: 'center',
    },

    description: {
        fontSize: 14,
        color: colors.neutral,
        textAlign: 'center',
        lineHeight: 20,
    },

        actions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginTop: 4,
    },

    cancelButton: {
        flex: 1,
        minHeight: 44,
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },

    cancelButtonText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },

    confirmButton: {
        flex: 1,
        minHeight: 44,
        backgroundColor: colors.error,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },

    confirmButtonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    }
});