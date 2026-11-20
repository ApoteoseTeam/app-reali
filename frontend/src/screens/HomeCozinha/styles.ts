import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = '#102B53';
const branco = '#FFFFFF';

export const coresRodape = {
    ativa: '#C8DFB9',
    inativa: '#FFFFFF',
};

export const styles = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: branco,
    },
    cabecalho: {
        minHeight: 64,
        justifyContent: 'center',
        paddingHorizontal: 18,
        backgroundColor: azul,
    },
    logo: {
        width: 34,
        height: 34,
        tintColor: branco,
    },
    scroll: {
        flex: 1,
    },
    conteudo: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        padding: 14,
        paddingBottom: 28,
        gap: 24,
    },
    saudacao: {
        paddingHorizontal: 4,
        gap: 4,
    },
    titulo: {
        color: colors.secondary,
        fontSize: 22,
        fontWeight: '700',
    },
    data: {
        color: '#52665B',
        fontSize: 14,
    },
    cartao: {
        backgroundColor: colors.secondary,
        borderWidth: 0,
        borderRadius: 28,
        paddingHorizontal: 14,
        paddingVertical: 28,
        gap: 22,
    },
    rotulo: {
        color: branco,
        fontSize: 15,
        fontWeight: '700',
    },
    numero: {
        color: branco,
        fontSize: 80,
        fontWeight: '700',
    },
    presentes: {
        color: branco,
        fontSize: 19,
    },
    planejamento: {
        color: branco,
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
    },
    foto: {
        width: '100%',
        aspectRatio: 5 / 3,
        maxHeight: 260,
        borderRadius: 16,
    },
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
        color: branco,
        fontSize: 11,
        fontWeight: '600',
    },
});