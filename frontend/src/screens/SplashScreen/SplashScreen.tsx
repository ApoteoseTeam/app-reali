import { View, Text, Image } from "react-native";
import { ProgressBar } from "../../components/progressbar/Progressbar";
import { styles } from "./style";

type SplashScreenProps = {
    progress: number;
};

export const SplashScreen = ({ progress }: SplashScreenProps) => {
    return (
        <View style={styles.container}>
            <Image
                source={require("../../assets/logo-reali.png")}
                style={styles.logo}
            />
            <ProgressBar progress={progress} />
            <Text style={styles.text}>Iniciando...</Text>
        </View>
    );
};