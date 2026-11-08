import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    header: {
        height: 90,
        backgroundColor: '#2D6252',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    titulo: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 25,
    },

    sino: {
        color: 'white',
        fontSize: 23,
        position: 'absolute',
        right: 20,
        top: 45,
    },

    etapas: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 28,
        marginHorizontal: 25,
    },

    etapa: {
        width: 30,
        height: 30,
        borderRadius: 20,
        backgroundColor: '#D8D8D8',
        alignItems: 'center',
        justifyContent: 'center',
    },

    etapaAtiva: {
        width: 30,
        height: 30,
        borderRadius: 20,
        backgroundColor: '#75A82B',
        alignItems: 'center',
        justifyContent: 'center',
    },

    numero: {
        color: '#222222',
        fontWeight: 'bold',
    },

    linha: {
        height: 1,
        backgroundColor: '#999999',
        flex: 1,
    },

    textosEtapas: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
        marginBottom: 28,
    },

    textoEtapa: {
        fontSize: 9,
        color: '#444444',
    },

    aviso: {
        backgroundColor: '#E8F3E9',
        marginHorizontal: 28,
        padding: 15,
        borderRadius: 20,
    },

    textoAviso: {
        fontSize: 11,
        color: '#426C5B',
    },

    conteudo: {
        paddingHorizontal: 28,
        paddingTop: 18,
        paddingBottom: 20,
    },

    subtitulo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#222222',
        marginTop: 12,
        marginBottom: 10,
    },

    data: {
        height: 38,
        borderWidth: 1,
        borderColor: '#888888',
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 15,
    },

    refeicoes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },

    botaoRefeicao: {
        borderWidth: 1,
        borderColor: '#DDDDDD',
        padding: 8,
        borderRadius: 5,
    },

    almoco: {
        backgroundColor: '#37845B',
        padding: 9,
        borderRadius: 5,
    },

    textoBotao: {
        fontSize: 9,
        color: '#555555',
    },

    textoBranco: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
        textAlign: 'center',
    },

    titulosColunas: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },

    textoPequeno: {
        fontSize: 8,
        color: '#555555',
    },

    alimento: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        backgroundColor: '#F5F5F5',
        padding: 4,
        borderRadius: 8,
    },

    comida: {
        width: '35%',
        fontSize: 11,
        color: '#555555',
    },

    quantidade: {
        width: '30%',
        textAlign: 'center',
        backgroundColor: '#EEEEEE',
        borderWidth: 1,
        borderColor: '#D6D6D6',
        borderRadius: 6,
        padding: 7,
        fontSize: 11,
    },

    adicionar: {
        backgroundColor: '#E8F3E9',
        borderRadius: 20,
        padding: 8,
        marginTop: 2,
    },

    textoAdicionar: {
        fontSize: 10,
        color: '#426C5B',
        textAlign: 'center',
    },

    proximo: {
        backgroundColor: '#2D6252',
        padding: 15,
        borderRadius: 20,
        marginTop: 20,
        marginBottom: 5,
    },

    menu: {
        height: 65,
        backgroundColor: '#E6F3D5',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },

    itemMenu: {
        alignItems: 'center',
    },

    icone: {
        fontSize: 22,
        color: '#111111',
    },

    textoMenu: {
        fontSize: 9,
        color: '#111111',
    },
});
