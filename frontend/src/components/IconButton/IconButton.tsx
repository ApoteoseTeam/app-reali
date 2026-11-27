import { Pressable, type StyleProp, type ViewStyle } from "react-native"
import type { LucideIcon } from 'lucide-react-native';
import { IconButtonStyle } from "./styles"

interface IconButtonProps {
    icon: LucideIcon;
    onPress: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
    color?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

export const IconButton = ({ icon: Icon, onPress, accessibilityLabel, disabled, color, size, style }: IconButtonProps) => {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            disabled={disabled}
            accessibilityState={{ disabled }}
            onPress={onPress}
            style={({ pressed }) => [style ?? IconButtonStyle.Button, pressed && IconButtonStyle.buttonPressed, disabled && { opacity: 0.45 }]}>
            <Icon color={color} size={size} />
        </Pressable>
    )
}
