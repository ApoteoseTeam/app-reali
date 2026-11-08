import { typography } from "../../theme/typography";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { StyleSheet } from "react-native";


export const progressBarStyles = StyleSheet.create({
    track: {
        // Fundo, altura e arredondamento
        backgroundColor: colors.textSecondary,
        borderRadius: 20,
        height: 4,
        overflow: "hidden"
    },

    fill: {
        // Cor de preenchimento e altura
        backgroundColor: colors.primary,
        height: "100%",
    },
});