import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = '#102B53';
const verdeClaro = '#E6F2DA';

export const styles = StyleSheet.create({
    fundo: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },
    painel: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#FFFFFF',
        padding: 20,
        gap: 14,
    },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    textos: { flex: 1 },
    titulo: { color: azul, fontSize: 20, fontWeight: '700' },
    descricao: { color: '#465950', fontSize: 13, lineHeight: 18 },
    fechar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: verdeClaro,
    },
    opcoes: { gap: 12 },
    opcao: {
        minHeight: 68,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.surface,
        borderRadius: 14,
    },
    icone: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: verdeClaro,
    },
    nomeOpcao: { color: azul, fontSize: 16, fontWeight: '700' },
    desabilitada: { opacity: 0.55 },
});