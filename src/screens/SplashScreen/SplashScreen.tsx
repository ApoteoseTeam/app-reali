import { View, Text } from "react-native";
import { ProgressBar } from "../../components/progressbar/Progressbar";

type SplashScreenProps = {
    progress: number;
};

export const SplashScreen = ({ progress }: SplashScreenProps) => {
    return (
        <View style={{ flex: 1, justifyContent: "flex-end", padding: 32 }}>
            {/* Logo e slogan ficam posicionados pelos estilos da tela */}

            <ProgressBar progress={progress} />
            <Text style={{ textAlign: "center", marginTop: 12 }}>
                Iniciando...
            </Text>
        </View>
    );
};