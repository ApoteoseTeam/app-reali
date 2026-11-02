import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { StyleSheet } from "react-native"


export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 1,
        paddingTop: 24,
    },

    topContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#DCE7D6',
    },
    logo: {
        width: 50,
        height: 50,
    },

    bell: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E7F2D9',
        alignItems: 'center',
        justifyContent: 'center',
    },

    bellImage: {
        width: 50,
        height: 50,
    },
    content: {
        gap: 5,
    },
    title: {
        fontSize: 22,
        color: colors.secondary,
        fontWeight: typography.weights.bold,
    },
    subtitle: {
        fontSize: 12,
        color: colors.neutral
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    cardAttention: {
        backgroundColor: '#FDF6E2',
        padding: 16,
        borderRadius: 12
    },
    textCardAttention: {
        fontWeight: 'bold',
        color: '#5A4A00'
    },
    textNormal: {
        fontWeight: 'normal'
    },
    menuContainer: {
        flexDirection: 'row',          
        justifyContent: 'space-between', 
        marginVertical: 16,
    },
    menuCard: {
        borderWidth: 1,
        borderColor: '#C2D1C9',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '23%',
        aspectRatio: 0.85,
        backgroundColor: '#FFFFFF',
    },
    menuText: {
        marginTop: 6,
        color: '#1F3A30',
        fontSize: 12,
        fontWeight: '600',
    },
    textFooter: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 8
    },
    footerContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#E5EFE2',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#D1E2CD',
    },
    footerItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerTextActive: {
        color: '#1F3A30',
        fontWeight: 'bold',
        fontSize: 14,
    },
    footerTextInactive: {
        color: '#6B8278',
        fontWeight: 'normal',
        fontSize: 14,
    },
})