import { Pressable } from "react-native"
import type { LucideIcon } from 'lucide-react-native';
import { IconButtonStyle } from "./styles"
import { globalStyles } from '../../theme/global'

interface IconButtonProps {
    icon: LucideIcon;
    onPress: () => void;

}

export const IconButton = ({ icon: Icon, onPress }: IconButtonProps) => {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [IconButtonStyle.Button, pressed && IconButtonStyle.buttonPressed,]}>
            <Icon />
        </Pressable>
    )
}