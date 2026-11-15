import { Text, View, type StyleProp, type ViewStyle } from "react-native"
import { globalStyles } from "../../theme/global"
import type { ReactNode } from "react";
type CardProps = {
    title: string
    description?: string
    children?: ReactNode
    style?: StyleProp<ViewStyle>

}

export const Card = ({ title, description, children, style }: CardProps) => {
    return (
        <View style={[globalStyles.cardContainer, style]}>
            {title ? (
                <Text style={globalStyles.cardTitle} accessibilityRole="header">
                    {title}
                </Text>
            ) : null}

            {description ? (
                <Text style={globalStyles.cardDescription}>
                    {description}
                </Text>
            ) : null}   

            {children}
        </View>
    );
};