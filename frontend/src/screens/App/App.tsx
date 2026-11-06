import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Asset } from "expo-asset";
import * as ExpoSplashScreen from "expo-splash-screen";

import { SplashScreen } from "../SplashScreen/SplashScreen";

// Deve ser chamado fora do componente.
void ExpoSplashScreen.preventAutoHideAsync();
type LoadingStatus = "loading" | "success" | "error";

export default function App() {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<LoadingStatus>("loading");

    useEffect(() => {
        const initialize = async () => {
            try {
                // Carrega um recurso real do aplicativo.
                await Asset.loadAsync([
                    require("../../assets/splash-icon.png"),
                ]);

                setProgress(100);
                setStatus("success");
            } catch (err) {
                console.error("Erro na inicialização:", err);
                setStatus("error");
            }
        };

        void initialize();
    }, []);

    const onLayout = useCallback(() => {
        // A tela React já foi montada.
        void ExpoSplashScreen.hideAsync();
    }, []);
    
    return (
        <View style={{ flex: 1 }} onLayout={onLayout}>
            {status === "success" ? (
                // Substitua pela sua tela inicial real.
                <View style={{ flex: 1 }} />
            ) : status === "error" ? (
                // Implemente uma tela de erro com opção de tentar novamente.
                <View style={{ flex: 1 }} />
            ) : (
                <SplashScreen progress={progress} />
            )}
        </View>
    );
}