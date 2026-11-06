import { Text, View, } from "react-native"
import { globalStyles } from "../../theme/global"
import type { ReactNode, } from "react";
type CardProps = {
    title: string
    description?: string
    children?: ReactNode

}

export const Card = ({ title, description, children }: CardProps) => {
    return (
        <View style={globalStyles.cardContainer}>
            <Text style={globalStyles.cardTitle} accessibilityRole="header">{title}</Text>
            {description ? (
                <Text style={globalStyles.cardDescription}> {description}</Text>
            ) : null}
            {children}
        </View>
    )
}