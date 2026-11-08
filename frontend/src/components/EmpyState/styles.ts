import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: 337,
    },
    illustration: {
        width: 146,
        height: 148,
    },
    title: {
        fontSize: 22,
        fontWeight: typography.weights.bold,
        color: colors.secondary,
        textAlign: 'center',
    },
    description: {
        marginTop: 28,
        fontSize: 15,
        lineHeight: 21,
        color: '#5E6B64',
        textAlign: 'center',
    },
    button: {
        alignSelf: 'stretch',
        marginTop: 34,
        minHeight: 50,
        paddingVertical: 12,
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#2C5E4E',
    },
    buttonText: {
        fontSize: 17,
        color: '#FFFFFF',
    },
});