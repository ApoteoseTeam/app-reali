import { StyleSheet } from "react-native";
const azul = '#102B53';

export const styles = StyleSheet.create({
    fundo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },
    cartao: {
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        padding: 20,
        gap: 12,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
    },
    icone: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6F2DA',
    },
    iconeErro: { backgroundColor: '#FCE4DE' },
    titulo: {
        color: azul,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    descricao: { color: '#465950', fontSize: 13, textAlign: 'center' },
    arquivo: {
        color: azul,
        backgroundColor: '#E6F2DA',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        textAlign: 'center',
    },
    acoes: { width: '100%', gap: 8 },
    botao: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    botaoPrincipal: { backgroundColor: azul },
    botaoContorno: { borderColor: azul, borderWidth: 1 },
    textoAzul: { color: azul },
    textoBranco: { color: '#FFFFFF' },
});
