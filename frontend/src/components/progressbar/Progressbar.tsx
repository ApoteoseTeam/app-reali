import { View, DimensionValue } from "react-native"
import { progressBarStyles } from "./styles"

type ProgressbarProps = {
    progress: number
}

export const ProgressBar = ({ progress }: ProgressbarProps) => {
    const safeProgress = Math.max(0, Math.min(100, progress));
    return (
        <View accessibilityRole="progressbar"
            accessibilityLabel="Carregamento do aplicativo"
            accessibilityValue={{
                min: 0,
                max: 100,
                now: safeProgress
            }} style={progressBarStyles.track}>
            <View style={[
                progressBarStyles.fill,
                { width: `${safeProgress}%` as DimensionValue },
            ]}>

            </View>
        </View>
    )
}