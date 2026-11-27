import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = '#102B53';
const branco = '#FFFFFF';

export const coresRodape = {
    ativa: '#C8DFB9',
    inativa: '#FFFFFF',
};

export const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: branco,
    },

    header: {
        minHeight: 64,
        justifyContent: 'center',
        paddingHorizontal: 18,
        backgroundColor: azul,
    },

    logo: {
        width: 53,
        height: 53,
        tintColor: branco,
    },

    scroll: {
        flex: 1,
    },

    content: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 14,
        paddingBottom: 28,
        gap: 24,
    },

    greeting: {
        paddingHorizontal: 4,
        gap: 4,
    },

    title: {
        color: colors.secondary,
        fontSize: 22,
        fontWeight: '700',
    },

    date: {
        color: '#52665B',
        fontSize: 14,
    },

    card: {
        backgroundColor: colors.secondary,
        borderWidth: 0,
        borderRadius: 28,
        paddingHorizontal: 14,
        paddingVertical: 28,
        gap: 22,
    },

    label: {
        color: branco,
        fontSize: 15,
        fontWeight: '700',
    },

    number: {
        color: branco,
        fontSize: 80,
        fontWeight: '700',
    },

    presence: {
        color: branco,
        fontSize: 19,
    },
    
    planning: {
        color: branco,
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
    },

    photo: {
        width: '100%',
        aspectRatio: 5 / 3,
        maxHeight: 205,
        borderRadius: 16,
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
        color: branco,
        fontSize: 11,
        fontWeight: '600',
    },
});