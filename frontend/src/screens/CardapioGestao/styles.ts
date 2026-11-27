import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = '#102B53';

export const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },

    header: {
        minHeight: 64,
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: azul,
    },

    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },

    scroll: {
        flex: 1
    },

    content: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 16,
        paddingBottom: 24,
        gap: 10,
    },

    period: {
        color: azul,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },

    measurements: {
        marginTop: 10,
        padding: 14,
        gap: 4,
        borderWidth: 0,
        borderRadius: 12,
        backgroundColor: colors.secondary,
    },

    titleMeasures: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },

    textMeasures: {
        color: '#FFFFFF',
        fontSize: 13,
        lineHeight: 18
    },

    activeTab: {
        color: '#C8DFB9'
    },

    footer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        backgroundColor: azul,
    },

    tab: {
        flex: 1,
        minHeight: 52,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },

    textTab: {
        fontSize: 11,
        fontWeight: '600'
    },

});