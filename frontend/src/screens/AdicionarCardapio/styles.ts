import { StyleSheet } from 'react-native';

const azul = '#102B53';
const branco = '#FFFFFF';

export const styles = StyleSheet.create({
    screen: {
        flex: 1, 
        backgroundColor: branco
    },

    header: {
        minHeight: 56,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: azul,
    },

    title: {
        color: branco, 
        fontSize: 17, 
        fontWeight: '700'
    },

    back: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerSpacer: {
        width: 44
    },

    scroll: {
        flex: 1
    },

    content: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        padding: 20,
        gap: 16,
    },

    list: {
        gap: 8
    },

    label: {
        color: azul, 
        fontSize: 14, 
        fontWeight: '700'
    },

    ingredient: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 8,
        borderRadius: 12,
        backgroundColor: '#E6F2DA',
    },

    ingredientTexts: {
        flex: 1
    },
    name: {
        color: azul, 
        fontSize: 15, 
        fontWeight: '700'
    },

    measurement: {
        color: '#465950',
        fontSize: 12,
        lineHeight: 17
    },

    remove: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: branco,
        alignItems: 'center',
        justifyContent: 'center',
    },

    footer: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 8,
        gap: 10,
    },

    button: {
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    filled: {
        backgroundColor: azul
    },
    outlined: {
        borderWidth: 2, borderColor: azul, backgroundColor: branco
    },

    blueText: {
        color: azul
    },

    disabled: {
        opacity: 0.5
    },

    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    modal: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        padding: 16,
        gap: 12,
        borderRadius: 12,
        backgroundColor: branco,
    },

    option: {
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
});