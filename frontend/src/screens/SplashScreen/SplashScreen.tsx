import { View, Text, Image } from "react-native";
import { ProgressBar } from "../../components/Progressbar/Progressbar";
import { styles } from "./SplashScreen.styles";

type SplashScreenProps = {
    progress: number;
};

export const SplashScreen = ({ progress }: SplashScreenProps) => {
    return (
        <View style={styles.container}>
            <Image
                source={require("../../assets/logo.png")}
                style={styles.logo}
            />
            <ProgressBar progress={progress} />
            <Text style={styles.texto}>Iniciando...</Text>
        </View>
    );
};