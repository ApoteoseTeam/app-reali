import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = '#102B53';

export const styles = StyleSheet.create({
    tela: { flex: 1, backgroundColor: '#FFFFFF' },
    cabecalho: {
        minHeight: 64,
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: azul,
    },
    titulo: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    scroll: { flex: 1 },
    conteudo: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 16,
        paddingBottom: 24,
        gap: 10,
    },
    periodo: {
        color: azul,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    medidas: {
        marginTop: 10,
        padding: 14,
        gap: 4,
        borderWidth: 0,
        borderRadius: 12,
        backgroundColor: colors.secondary,
    },
    tituloMedidas: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    textoMedidas: { color: '#FFFFFF', fontSize: 13, lineHeight: 18 },

    abaAtiva: { color: '#C8DFB9' },

    rodape: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        backgroundColor: azul,
    },

    aba: {
        flex: 1,
        minHeight: 52,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },

    textoAba: {
        fontSize: 11,
        fontWeight: '600'
    },

});