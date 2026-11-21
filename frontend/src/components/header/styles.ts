import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export const style = StyleSheet.create({
        container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingHorizontal: 20,
        backgroundColor: colors.secondary,
    },

    container_name: {
        padding: 15,
    },
    titleGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1, gap: 4 },
    logoFrame: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 64, height: 64 },
    pagename: {
        color: colors.textSecondary,
        fontSize: typography.sizes.title,
        fontWeight: typography.weights.bold,
        flexShrink: 1,
        paddingVertical: 16,
    },
    icon: {
        position: 'absolute',
        right: 24,
        height: 48,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
