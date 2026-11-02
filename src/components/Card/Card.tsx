import {Text, View, } from "react-native"
import { globalStyles } from "../../theme/global" 
import type { ReactNode, } from "react";
type CardProps = {
    title: string
    description: string
    children?: ReactNode

}

export const Card = ({ title, description, children }: CardProps) => {
    return (
        <View style={globalStyles.cardContainer}  accessibilityRole="header">
            <Text style={globalStyles.cardTitle}>{title}</Text>
            <Text style={globalStyles.cardDescription}>{description}</Text>
            {children }
        </View>

    )
}