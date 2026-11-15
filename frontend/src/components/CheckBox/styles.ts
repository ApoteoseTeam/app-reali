import { StyleSheet } from "react-native";

import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const styles = StyleSheet.create({
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
    },

    checkboxBox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },

    checkboxText: {
        fontSize: typography.sizes.body,
        color: colors.text,
        marginLeft: 8,
    },

    checkboxChecked: {
        backgroundColor: colors.primary,
    },

    checkboxIcon: {
        color: colors.background,
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
        lineHeight: 20,
        textAlign: "center",
    },
})