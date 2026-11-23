import { StyleSheet } from "react-native"

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F8F2',
    },

    topBlob: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 190,
        height: 150,
    },

    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 90, 
        zIndex: 2,
    },

    headerGroup: {
        alignItems: 'center',
        marginBottom: 24,
    },

    logo: {
        width: 240,
        height: 110,
    },

    subtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#163254',
        marginTop: 4,
    },

    description: {
        fontSize: 13.5,
        color: '#2B2B2B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 34,
        paddingHorizontal: 8,
    },

    buttonContainer: {
        width: '100%',
        gap: 14,
    },

    buttonOne: {
        backgroundColor: '#163254',
        borderRadius: 10,
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
    },

    buttonOneText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },

    buttonTwo: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#163254',
        borderRadius: 10,
        height: 46,
        justifyContent: 'center',
        alignItems: 'center',
    },

    buttonTwoText: {
        color: '#163254',
        fontWeight: '600',
        fontSize: 15,
    },

    bottomWave: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: 165,
        zIndex: 1,
    },
    
    foodImage: {
        position: 'absolute',
        bottom: -10,
        right: -20,
        width: 270,
        height: 210,
        zIndex: 3,
    },
});