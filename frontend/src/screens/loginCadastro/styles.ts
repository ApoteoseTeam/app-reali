import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    conteudo: {
        flex: 1,
    },
    cabecalho: {
        backgroundColor: '#E7F2D9',
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 18,
        paddingHorizontal: 18,
    },
    logo: {
        fontSize: 30,
        fontWeight: '700',
        color: '#315E52',
        letterSpacing: -0.8,
    },
    logoDestaque: {
        color: '#3D821C',
    },
    subtitulo: {
        marginTop: 5,
        fontSize: 11,
        color: '#52665C',
        textAlign: 'center',
    },
    abas: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#D7E4CC',
    },
    aba: {
        flex: 1,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    abaSelecionada: {
        borderBottomColor: '#315E52',
    },
    textoAba: {
        fontSize: 15,
        color: '#60746A',
    },
    textoAbaSelecionada: {
        color: '#315E52',
        fontWeight: '700',
    },
    paginas: {
        flex: 1,
    },
    formulario: {
        flexGrow: 1,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 32,
    },
    grupo: {
        marginBottom: 14,
    },
    grupoSenha: {
        marginBottom: 4,
    },
    label: {
        marginBottom: 6,
        fontSize: 12,
        fontWeight: '600',
        color: '#315E52',
    },
    input: {
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#B4D1A5',
        backgroundColor: '#F6FAF2',
        color: '#263B32',
        fontSize: 14,
    },
    inputErro: {
        borderColor: '#C93B2B',
        backgroundColor: '#FFFFFF',
    },
    seletor: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textoFuncao: {
        fontSize: 14,
        color: '#263B32',
    },
    seta: {
        fontSize: 22,
        color: '#315E52',
    },
    opcoes: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#B4D1A5',
        borderRadius: 9,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    opcao: {
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    opcaoSelecionada: {
        backgroundColor: '#E7F2D9',
    },
    marcador: {
        color: '#315E52',
        fontWeight: '700',
    },
    ajuda: {
        marginTop: 6,
        fontSize: 11,
        color: '#60746A',
    },
    textoErro: {
        color: '#C93B2B',
    },
    termos: {
        marginTop: 10,
        marginBottom: 10,
    },
    botao: {
        minHeight: 46,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#315E52',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nota: {
        marginTop: 12,
        fontSize: 11,
        color: '#6C7D73',
        textAlign: 'center',
        lineHeight: 16,
    },
});