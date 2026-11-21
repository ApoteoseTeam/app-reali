import { Text, View } from "react-native";
import { Logo } from "../../components/Logo/Logo";
import { Button } from "../../components/Button/Button";
import { stylesInicializacao as styles } from "./styles";

type Props = { error?: string | null; onRetry?: () => void };

export default function InicializacaoStatic({ error, onRetry }: Props) {
  return (
    <View style={styles.container} testID="reali-initializing">
      <Logo style={styles.logo} />
      <Text style={styles.subtitle}>Mais controle, menos desperdício</Text>
      {error ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Button label="Tentar novamente" accessibilityRole="button" onPress={onRetry} />
        </>
      ) : (
        <>
          <View style={styles.track} accessible accessibilityRole="progressbar" accessibilityLabel="Inicializando o Reali">
            <View style={styles.fill} />
          </View>
          <Text style={styles.loadingText}>Iniciando…</Text>
        </>
      )}
    </View>
  );
}
