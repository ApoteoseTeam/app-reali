import { StyleSheet } from "react-native"

import { colors } from "../../theme/colors"
import { spacing } from "../../theme/spacing"
import { typography } from "../../theme/typography"


export const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: "center",
    },

    buttonText: {
        color: colors.background,
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
    },
})