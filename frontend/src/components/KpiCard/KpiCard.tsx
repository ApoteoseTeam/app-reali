import { View, Text } from "react-native"
import { kpicardStyles } from "./styles";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

type KpicardVariant = "primary" | "secondary";

type KpicardProps = {
    variant?: KpicardVariant
    title: string
    value: number
    unit?: string
    change?: number
    lowerIsBetter?: boolean;
}

export const Kpicard = ({ title, value, unit, variant = "primary", change, lowerIsBetter = false, }: KpicardProps) => {
    const isFavorable =
        change !== undefined &&
        change !== 0 &&
        (lowerIsBetter ? change < 0 : change > 0);

    const changeDirection =
        change === undefined
            ? ""
            : change > 0
                ? "aumento"
                : change < 0
                    ? "redução"
                    : "sem alteração";

    const changeStatus =
        change === undefined
            ? ""
            : change === 0
                ? "Sem alteração, resultado neutro."
                : isFavorable
                    ? "resultado favorável"
                    : "resultado desfavorável";

    const accessibilityDescription =
        `${title}: ${value.toLocaleString("pt-BR")} ${unit ?? ""}` +
        (change !== undefined
            ? `. ${changeDirection} de ${Math.abs(change)} por cento, ${changeStatus}.`
            : ".");
    return (
        <View accessible={true}
            accessibilityLabel={accessibilityDescription}
            style={[
                kpicardStyles.KpicardBox,
                variant === "primary"
                    ? kpicardStyles.kpicardPrimary
                    : kpicardStyles.kpicardSecondary,
            ]}>
            <Text style={kpicardStyles.kpicardTitle}>{title}</Text>
            <View style={kpicardStyles.kpicardValueContainer}>
                <Text style={kpicardStyles.kpicardValue}>{value.toLocaleString("pt-BR")}</Text>
                <Text style={kpicardStyles.kpicardUnit}>{unit}</Text>
            </View>
            {change !== undefined && (
                <View style={kpicardStyles.kpicardChangeContainer}>
                    <Feather
                        name={
                            change > 0
                                ? "trending-up"
                                : change < 0
                                    ? "trending-down"
                                    : "minus"
                        }
                        size={16}
                        color={
                            change === 0
                                ? colors.neutral
                                : isFavorable
                                    ? colors.favorable
                                    : colors.unfavorable
                        }
                    />
                    <Text style={
                        change === 0
                            ? kpicardStyles.kpicardChangeNeutral
                            : isFavorable
                                ? kpicardStyles.kpicardChangeFavorable
                                : kpicardStyles.kpicardChangeUnfavorable
                    }
                    >
                        {change > 0 ? "+" : ""}
                        {change}%</Text>
                </View>
            )}
        </View>
    )
}