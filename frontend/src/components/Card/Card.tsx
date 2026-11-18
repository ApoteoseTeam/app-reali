import { Text, View, type StyleProp, type ViewStyle } from "react-native"
import type { ReactNode } from "react";
import { styles } from './styles';
type CardProps = {
    title?: string
    description?: string
    children?: ReactNode
    style?: StyleProp<ViewStyle>
}

export const Card = ({ title, description, children, style }: CardProps) => {
    return (
        <View style={[styles.cardContainer, style]}>
            {title ? (
                <Text style={styles.cardTitle} accessibilityRole="header">
                    {title}
                </Text>
            ) : null}

            {description ? (
                <Text style={styles.cardDescription}>
                    {description}
                </Text>
            ) : null}   

            {children}
        </View>
    );
};