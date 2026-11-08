import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({

    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        width: "100%",
        height: 56,
        backgroundColor: "#E6F0DF",
        borderTopWidth: 1,
        borderTopColor: "#D6E5CD",
    },

    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    iconButton: {
        padding: 2,
        backgroundColor: "transparent",
    },

    label: {
        fontSize: 9,
        color: "#718078",
        marginTop: 2,
    },

    activeLabel: {
        color: "#315E50",
        fontWeight: "bold",
    },

});