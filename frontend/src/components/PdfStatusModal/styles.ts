import { StyleSheet } from "react-native";
const azul = '#102B53';

export const styles = StyleSheet.create({
    background: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },
    card: {
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        padding: 20,
        gap: 12,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
    },
    icon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6F2DA',
    },

    errorIcon: {
        backgroundColor: '#FCE4DE'
    },

    title: {
        color: azul,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },

    description: {
        color: '#465950', fontSize: 13, textAlign: 'center'
    },

    archive: {
        color: azul,
        backgroundColor: '#E6F2DA',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        textAlign: 'center',
    },

    rail: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#DCE8CF',
    },

    bar: {
        height: '100%', borderRadius: 3, backgroundColor: azul
    },

    actions: {
        width: '100%', gap: 8
    },

    button: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: 10,
    },

    mainButton: {
        backgroundColor: azul
    },

    outlineButton: {
        borderColor: azul, borderWidth: 1
    },

    blueText: {
        color: azul
    },
    
    whiteText: {
        color: '#FFFFFF'
    },
});