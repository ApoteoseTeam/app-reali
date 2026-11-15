import { StyleSheet } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export const styles = StyleSheet.create({
    input: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: 8,
        fontSize: typography.sizes.body,
        color: colors.text,
    },
})