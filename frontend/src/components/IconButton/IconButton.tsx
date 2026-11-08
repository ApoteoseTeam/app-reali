import { Pressable, type StyleProp, type ViewStyle } from "react-native"
import type { LucideIcon } from 'lucide-react-native';
import { IconButtonStyle } from "./styles"

interface IconButtonProps {
    icon: LucideIcon;
    onPress: () => void;
    accessibilityLabel?: string;
    color?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

export const IconButton = ({ icon: Icon, onPress, accessibilityLabel, color, size, style }: IconButtonProps) => {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress} style={({ pressed }) => [style ?? IconButtonStyle.Button, pressed && IconButtonStyle.buttonPressed,]}>
            <Icon color={color} size={size} />
        </Pressable>
    )
}