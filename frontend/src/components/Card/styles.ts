import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";



export const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.border
    },

    cardTitle: {
        fontSize: typography.sizes.title,
        fontWeight: typography.weights.bold,
        color: colors.primary

    },

    cardDescription: {
        fontSize: typography.sizes.subtitle,
        lineHeight: 26,
        marginTop: spacing.sm,
        color: colors.secondary
    },
});