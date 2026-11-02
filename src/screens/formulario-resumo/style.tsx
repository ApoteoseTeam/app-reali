import { StyleSheet } from "react-native";
import { spacing } from "../../theme/spacing";
import { colors } from "../../theme/colors";

export const styles = StyleSheet.create({
    container: {
        flex: 1
    },

    stepper: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    step: {
        alignItems: "center",
    },

    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#395D4F",
        alignItems: "center",
        justifyContent: "center",
    },

    stepNumber: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },

    stepText: {
        fontSize: 12,
        marginTop: 6,
    },

    stepLine: {
        height: 2,
        backgroundColor: "#395D4F",
        flex: 1,
        marginHorizontal: 4,
    },

    stepCircleCurrent: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#395D4F",
        alignItems: "center",
        justifyContent: "center",
    },

    stepNumberCurrent: {
        color: "#395D4F",
        fontSize: 14,
        fontWeight: "bold",
    },

    topContent: {
        flex: 1,
        justifyContent: 'flex-start',
        gap: 10
    },

    title: {
        marginTop: 5,
        fontSize: 13,
        color: '#2F5D50',
        fontWeight: 'bold'
    },
    banner: {
        marginTop: 8,
        marginBottom: 8
    },
    input: {
        gap: 10
    },

    table: {
        width: '100%',
        marginBottom: spacing.lg,
    },

    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#D9E5D4"
    },

    tableText: {
        flex: 1.5,
        fontSize: 12,
        color: "#52645B"
    },

    tableTop: {
        flex: 1,
        fontSize: 12,
        color: "#52645B",
        textAlign: 'right'
    },

    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#D9E5D4"
    },

    tableName: {
        flex: 1.5,
        fontSize: 12,
        color: "#263B34"
    },

    tableCell: {
        flex: 1,
        fontSize: 12,
        color: "#263B34",
        textAlign: 'right'
    },

    totalRow: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1.5,
        borderTopColor: "#315F50",
        paddingVertical: 9
    },

    totalName: {
        flex: 1.5,
        fontSize: 12,
        fontWeight: "bold",
        color: "#263B34"
    },

    totalCell: {
        flex: 1,
        fontSize: 12,
        fontWeight: "bold",
        color: "#263B34",
        textAlign: "right"
    },

    resumoCard: {
        backgroundColor: "#F6FAF2",
        padding: 20,
        borderRadius: 10,
        marginTop: 16,
        marginBottom: spacing.lg,
    },

    resumoTitulo: {
        fontSize: 16,
        color: "#212121",
        fontWeight: "500",
    },

    resumoValor: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#395D4F",
        marginTop: 8,
    },

    resumoDescricao: {
        fontSize: 14,
        color: "#666666",
        marginTop: 8,
    },

    button: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
        alignItems: "center",
        gap: spacing.md,
    },

    widthButton: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: "center",
    },

    backgroundButton: {
        flex: 1,
        backgroundColor: 'transparent',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: '□#395D4F',
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center"
    },

    textStyle: {
        color: '#395D4F'
    }
})