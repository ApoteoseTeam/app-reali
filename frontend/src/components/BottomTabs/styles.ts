import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        width: "100%",
        height: 56,
        backgroundColor: colors.primary,
        borderTopWidth: 1,
        borderTopColor: colors.primary,
    },

    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    label: {
        fontSize: 9,
        marginTop: 2,
    },

    activeLabel: {
        fontWeight: "bold",
    },
});