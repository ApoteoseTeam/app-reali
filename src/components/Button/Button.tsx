import { Text, TouchableOpacity, TouchableOpacityProps, StyleProp, TextStyle } from "react-native"
import { globalStyles } from '../../theme/global'

type ButtonProps = TouchableOpacityProps & {
    label: string
    textStyle?: StyleProp<TextStyle>
}
export const Button = ({ label, textStyle, ...rest }: ButtonProps) => {
    return (
        <TouchableOpacity style={globalStyles.button} activeOpacity={0.85} {...rest}>
            <Text style={[globalStyles.buttonText, textStyle]}>{label}</Text>

        </TouchableOpacity>
    )
}