import { Text, Pressable, View, } from "react-native"
import { styles } from "./styles";

type CheckboxProps = {
    text: string
    checked: boolean
    onChange: (value: boolean) => void

}
export const Checkbox = ({ text, checked, onChange }: CheckboxProps) => {
    return (
        <Pressable style={styles.checkboxContainer}
            accessibilityRole="checkbox"
            accessibilityLabel={text}
            accessibilityState={{ checked }} onPress={() => onChange(!checked)}>
            <View style={[styles.checkboxBox, checked && styles.checkboxChecked]}>
                {checked && (<Text style={styles.checkboxIcon}>✓</Text>)}
            </View>
            <Text style={styles.checkboxText}>{text}</Text>
        </Pressable>
    )
};