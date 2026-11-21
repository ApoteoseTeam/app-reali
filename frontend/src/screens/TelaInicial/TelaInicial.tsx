import { Image, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Button } from "../../components/Button/Button";
import { Logo } from "../../components/Logo/Logo";
import { styles } from "./styles";

export default function TelaInicial({ onEnter }: { onEnter: () => void }) {
  const { height } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.surface} testID="reali-welcome">
          <View pointerEvents="none" style={styles.topShape} />
          <View style={styles.content}>
            <View style={styles.brand}>
              <Logo style={styles.logo} />
              <Text style={styles.tagline}>Mais controle, menos desperdício</Text>
            </View>
            <Text style={styles.description}>
              Acompanhe e reduza o desperdício da merenda escolar. Dados que ajudam a construir um futuro mais sustentável.
            </Text>
            <Button label="Entrar" accessibilityRole="button" testID="welcome-enter"
              style={styles.enter} textStyle={styles.enterText} onPress={onEnter} />
          </View>
          <View pointerEvents="none" style={[styles.art, { height: Math.min(230, Math.max(138, height * 0.24)) }]}>
            <View style={styles.wave} />
            <Image source={require("../../assets/prato-boas-vindas.png")} style={styles.plate} resizeMode="contain" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
