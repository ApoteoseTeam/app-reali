import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export const IconButtonStyle = StyleSheet.create({
    Button: {
        width: 48,
        height: 48,
        backgroundColor: colors.secondary,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        color: colors.textSecondary,
    },
    buttonPressed: {
        backgroundColor: "#41806eff",
        transform: [{ scale: 0.93 }],
    },
});