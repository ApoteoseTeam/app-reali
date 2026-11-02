import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { StyleSheet } from "react-native";

const FONT = 'Arial';

export const stylesInicializacao = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9F5',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    spacer: {
        flex: 1,
    },
    centerContent: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 70,
    },
    logo: {
        fontFamily: FONT,
        fontWeight: '700',
        fontSize: 96,
        letterSpacing: -3,
        color: '#3B5B4C',
        includeFontPadding: false,
    },
    subtitle: {
        fontFamily: FONT,
        fontSize: 11,
        color: '#5F6B64',
        marginTop: 2,
        textAlign: 'center',
    },
    footer: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        paddingBottom: 24,
    },
    progressBar: {
        width: 160,
        height: 3,
        backgroundColor: 'transparent',
        marginBottom: 10,
    },
    progressFill: {
        width: '40%',
        height: '100%',
        backgroundColor: '#3B5B4C',
    },
    loadingText: {
        fontFamily: FONT,
        fontSize: 10,
        color: '#5F6B64',
    },


});