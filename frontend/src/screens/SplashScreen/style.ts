import { StyleSheet } from "react-native";
import { colors } from "../../colors";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        backgroundColor: colors.white,
    },
    logo: {
        width: 220,
        height: 120,
        resizeMode: "contain",
    },
    texto: {
        marginTop: 8,
        fontSize: 8,
        color: colors.gray,
    },
});