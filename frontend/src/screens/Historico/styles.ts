
import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"
import { spacing } from "../../theme/spacing"

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },

    content: {
        paddingTop: spacing.md,
        gap: spacing.sm,
        paddingHorizontal: spacing.md
    },

    title: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.primary,
    },

    description: {
        fontSize: 14,
        color: colors.primary,
    },

    leftOver: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: spacing.sm,
    },

    indicators: {
        flexDirection: "row",
        gap: spacing.sm,
        marginBottom: spacing.md,
    },

    indicator: {
        flex: 1,
    },

    presentation: {
        marginBottom: spacing.md,
        gap: spacing.xs,
    },

    titlePresentation: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.primary,
    },

    subtitlePresentation: {
        fontSize: 14,
        color:"#63756E"
,
    },

    messageVacated: {
        fontSize: 14,
        color: "#17365D",
        textAlign: "center",
        marginVertical: 24,
    },

})
