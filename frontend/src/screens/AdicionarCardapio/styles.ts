import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = colors.primary;
const branco = '#FFFFFF';

export const styles = StyleSheet.create({
    cabecalho: {
        minHeight: 56,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: azul,
    },
    titulo: { color: branco, fontSize: 17, fontWeight: '700' },
    voltar: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    espacoCabecalho: { width: 44 },

    scroll: { flex: 1, backgroundColor: branco },
    conteudo: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 16,
        gap: 14,
    },
    lista: { gap: 8 },
    rotulo: { color: azul, fontSize: 14, fontWeight: '700' },
    campo: { minHeight: 44, backgroundColor: colors.background, borderWidth: 1, borderColor: "#718B78", borderRadius: 8 },
    ingrediente: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 8,
        borderRadius: 12,
        backgroundColor: colors.surfaceLight,
    },
    textosIngrediente: { flex: 1 },
    nome: { color: azul, fontSize: 15, fontWeight: '700' },
    medida: { color: '#465950', fontSize: 12, lineHeight: 17 },
    remover: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: branco,
        alignItems: 'center',
        justifyContent: 'center',
    },

    rodape: { gap: 8 },
    botao: {
        minHeight: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    preenchido: { backgroundColor: azul },
    contorno: { borderWidth: 2, borderColor: azul, backgroundColor: branco },
    textoAzul: { color: azul },
    desabilitado: { opacity: 0.5 },

    fundoModal: {
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
    opcao: {
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
});
