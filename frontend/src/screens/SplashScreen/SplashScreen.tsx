import { ImageBackground, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../components/Button/Button";
import { Logo } from "../../components/Logo/Logo";
import { styles } from "./style";

type Props = { progress?: number; onReady?: () => void; error?: string | null; onRetry?: () => void };

export function SplashScreen({ progress, onReady, error, onRetry }: Props) {
  const fill = Math.max(0, Math.min(100, progress ?? 42));

  return (
    <ImageBackground source={require("../../assets/merenda-splash.jpg")} resizeMode="cover"
      style={styles.container} testID="reali-splash" onLoadEnd={onReady}>
      <StatusBar style="light" />
      <View style={styles.overlay} />
      <View style={styles.brand}>
        <Logo variant="white" style={styles.logo} />
        <Text style={styles.tagline}>Mais controle, menos desperdício</Text>
        {error ? (
          <View style={styles.feedback}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            {onRetry && <Button label="Tentar novamente" accessibilityRole="button" onPress={onRetry} />}
          </View>
        ) : null}
      </View>
      {!error && (
        <View style={styles.track} accessible accessibilityRole="progressbar" accessibilityLabel="Preparando o Reali"
          accessibilityValue={progress === undefined ? undefined : { min: 0, max: 100, now: fill }}>
          <View style={[styles.fill, { width: `${fill}%` }]} />
        </View>
      )}
    </ImageBackground>
  );
}
