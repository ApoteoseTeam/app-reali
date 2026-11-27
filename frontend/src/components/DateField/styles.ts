import { StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: 8,
    },

    label: {
        fontSize: 14,
        fontWeight: typography.weights.bold,
        color: colors.text,
    },

    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 44,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#565656',
        borderRadius: 10,
    },

    areaInput: {
        flex: 1,
        minWidth: 0,
    },

    input: {
        backgroundColor: 'transparent',
        padding: 0,
        paddingVertical: 10,
        fontSize: 14,
        color: '#565656',
    },

    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    window: {
        width: '100%',
        maxWidth: 380,
        maxHeight: '90%',
        flexGrow: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
    },

    windowContent: {
        padding: 16,
        gap: 16,
    },

    title: {
        fontSize: 18,
        fontWeight: typography.weights.bold,
        color: colors.secondary,
    },
});