import { StyleSheet, Platform } from "react-native";

const FONT = 'Arial';
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    fundoVerde: {
        position: 'absolute',
        top: -418,
        left: '50%',
        marginLeft: -315,
        width: 630,
        height: 630,
        borderRadius: 315,
        backgroundColor: '#3E6B5B',
    },

    topo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 56,
    },
    titulo: {
        fontFamily: FONT,
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    avatarArea: {
        alignSelf: 'center',
        marginTop: 33,
    },
    avatarBorda: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 7,
        borderColor: '#000000',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    editar: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#3E6B5B',
        alignItems: 'center',
        justifyContent: 'center',
    },

    nome: {
        fontFamily: SERIF,
        fontSize: 16,
        color: '#000000',
        textAlign: 'center',
        marginTop: 24,
    },
    cargo: {
        fontFamily: SERIF,
        fontSize: 11,
        color: '#000000',
        textAlign: 'center',
        marginTop: 2,
    },

    conteudo: {
        paddingHorizontal: 50,
        marginTop: 50,
        gap: 17,
    },
    card: {
        backgroundColor: '#D9D9D9',
        borderWidth: 1.5,
        borderColor: '#7FB236',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        gap: 12,
    },
    cardTitulo: {
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: '700',
        color: '#000000',
    },
    linha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    linhaTexto: {
        fontFamily: FONT,
        fontSize: 12,
        color: '#000000',
        flexShrink: 1,
    },
    botaoSair: {
        backgroundColor: '#D9D9D9',
        borderWidth: 1.5,
        borderColor: '#7FB236',
        borderRadius: 14,
        marginTop: 6,
        paddingVertical: 7,
        alignItems: 'center',
    },

    abas: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 8,
        paddingBottom: 20,
        backgroundColor: '#E4EFDA',
    },
    aba: {
        alignItems: 'center',
        gap: 2,
    },
    abaTexto: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '700',
        color: '#000000',
    },
});