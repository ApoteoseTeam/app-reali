import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const kpicardStyles = StyleSheet.create({

    KpicardBox: {
        padding: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },

    kpicardPrimary: {
        backgroundColor: colors.background,
    },

    kpicardSecondary: {
        backgroundColor: colors.secondary
    },

    kpicardTitle: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.medium,
        color: colors.text,
    },

    kpicardValueContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
        marginTop: spacing.sm,
    },

    kpicardValue: {
        fontSize: typography.sizes.large,
        fontWeight: typography.weights.bold,
        color: colors.text,
    },

    kpicardUnit: {
        fontSize: typography.sizes.small,
        color: colors.textSecondary
    },

    kpicardChangeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginTop: spacing.sm,
    },

    kpicardChangeFavorable: {
        color: colors.favorable,
    },

    kpicardChangeUnfavorable: {
        color: colors.favorable,
    },

    kpicardChangeNeutral: {
        color: colors.neutral,
    },
});