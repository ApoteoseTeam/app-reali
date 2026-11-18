import { Text, TouchableOpacity, TouchableOpacityProps, StyleProp, TextStyle } from "react-native"
import { styles } from "./styles"

type ButtonProps = TouchableOpacityProps & {
    label: string
    textStyle?: StyleProp<TextStyle>
}
export const Button = ({ label, textStyle, ...rest }: ButtonProps) => {
    return (
        <TouchableOpacity style={styles.button} activeOpacity={0.85} {...rest}>
            <Text style={[styles.buttonText, textStyle]}>{label}</Text>

        </TouchableOpacity>
    )
}