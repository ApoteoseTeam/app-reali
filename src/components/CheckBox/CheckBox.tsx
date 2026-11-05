import { Text, Pressable, View, } from "react-native"
import { globalStyles } from "../../theme/global"

type CheckboxProps = {
    text: string
    checked: boolean
    onChange: (value: boolean) => void

}
export const Checkbox = ({ text, checked, onChange }: CheckboxProps) => {
    return (
        <Pressable style={globalStyles.checkboxContainer}
            accessibilityRole="checkbox"
            accessibilityLabel={text}
            accessibilityState={{ checked }} onPress={() => onChange(!checked)}>
            <View style={[globalStyles.checkboxBox, checked && globalStyles.checkboxChecked]}>
                {checked && (<Text style={globalStyles.checkboxIcon}>✓</Text>)}
            </View>
            <Text style={globalStyles.checkboxText}>{text}</Text>
        </Pressable>
    )
};