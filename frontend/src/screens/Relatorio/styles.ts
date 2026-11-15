import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azulGestao = '#102B53';

export const styles = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    cabecalho: {
        minHeight: 56,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: azulGestao,
    },

    tituloCabecalho: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },

    conteudo: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 16,
        gap: 14,
    },

    relatorio: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.surface,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },

    marca: {
        width: 64,
        height: 28,
        alignSelf: 'flex-start',
    },

    tituloRelatorio: {
        color: azulGestao,
        fontSize: 17,
        fontWeight: '700',
    },

    info: {
        color: '#465950',
        fontSize: 13,
        lineHeight: 19,
    },

    indicadores: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    indicador: {
        flexGrow: 1,
        flexBasis: 136,
    },

    subtitulo: {
        color: colors.secondary,
        fontSize: 14,
        fontWeight: '700',
    },

    acoes: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 10,
        padding: 16,
    },

    botao: {
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

    botaoSecundario: {
        backgroundColor: '#FFFFFF',
    },

    textoSecundario: {
        color: azulGestao,
    },

    desabilitado: {
        opacity: 0.5,
    },

    comparacao: {
        color: '#3A6B24',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },

    diario: {
        gap: 8,
    },

    rotuloDiario: {
        color: colors.secondary,
        fontSize: 14,
        fontWeight: '600',
    },

    inputDiario: {
        minHeight: 44,
        backgroundColor: colors.secondary,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#FFFFFF',
    },

    ajudaDiario: {
        color: '#465950',
        fontSize: 12,
        lineHeight: 17,
    },

    cardMargem: {
        marginVertical: 8,
        padding: 14,
        gap: 4,
        borderWidth: 0,
        borderRadius: 12,
        backgroundColor: '#E6F2DA',
    },

    tituloMargem: {
        color: azulGestao,
        fontSize: 15,
        fontWeight: '700',
    },

    inputExtras: {
        minHeight: 44,
        backgroundColor: '#E6F2DA',
        borderWidth: 1,
        borderColor: colors.surface,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: azulGestao,
    },

    totalDiario: {
        marginTop: 24,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.secondary,
    },

    totalLegenda: {
        color: '#FFFFFF',
        fontSize: 13,
    },

    totalValor: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
    },

    salvarDiario: {
        marginTop: 20,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: azulGestao,
        borderRadius: 10,
    },
});