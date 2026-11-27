
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azulGestao = '#102B53';

export const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    header: {
        minHeight: 56,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: azulGestao,
    },

    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },

    content: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 16,
        gap: 14,
    },

    report: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.surface,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },

    brand: {
        width: 64,
        height: 28,
        alignSelf: 'flex-start',
    },

    reportTitle: {
        color: azulGestao,
        fontSize: 17,
        fontWeight: '700',
    },

    info: {
        color: '#465950',
        fontSize: 13,
        lineHeight: 19,
    },

    indicators: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    indicator: {
        flexGrow: 1,
        flexBasis: 136,
    },

    subtitle: {
        color: colors.secondary,
        fontSize: 14,
        fontWeight: '700',
    },

    actions: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 10,
        padding: 16,
    },

    button: {
        flex: 1,
        minHeight: 44,
        paddingHorizontal: 8,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: azulGestao,
        backgroundColor: azulGestao,
    },

    secondaryButton: {
        backgroundColor: '#FFFFFF',
    },

    secondaryText: {
        color: azulGestao,
    },

    disabled: {
        opacity: 0.5,
    },

    comparison: {
        color: '#3A6B24',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },

    daily: {
        gap: 8,
    },

    dailyLabel: {
        color: colors.secondary,
        fontSize: 14,
        fontWeight: '600',
    },

    dailyInput: {
        minHeight: 44,
        backgroundColor: colors.secondary,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#FFFFFF',
    },

    dailyHelp: {
        color: '#465950',
        fontSize: 12,
        lineHeight: 17,
    },

    marginCard: {
        marginVertical: 8,
        padding: 14,
        gap: 4,
        borderWidth: 0,
        borderRadius: 12,
        backgroundColor: '#E6F2DA',
    },

    marginTitle: {
        color: azulGestao,
        fontSize: 15,
        fontWeight: '700',
    },

    dailyTotal: {
        marginTop: 24,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.secondary,
    },

    totalLabel: {
        color: '#FFFFFF',
        fontSize: 13,
    },

    totalValue: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
    },


    tab: {
        flex: 1,
        minHeight: 52,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },

    tabText: {
        fontSize: 11,
        fontWeight: '600'
    },
});
