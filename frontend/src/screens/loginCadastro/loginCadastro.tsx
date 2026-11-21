import { useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useWindowDimensions, View,
} from 'react-native';

import { Button } from '../../components/Button/Button';
import { Checkbox } from '../../components/CheckBox/CheckBox';
import { Input } from '../../components/Input/Input';
import { styles } from './styles';

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onReset: () => void;
  sessionError: string | null;
};

const tabs = ['Entrar', 'Primeiro acesso'] as const;

export default function TelaAutenticacao({ onLogin, onReset, sessionError }: Props) {
  const { width } = useWindowDimensions();
  const pages = useRef<ComponentRef<typeof ScrollView>>(null);
  const running = useRef(false);
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectTab(index: number) {
    Keyboard.dismiss();
    setTab(index);
    pages.current?.scrollTo({ x: width * index, animated: true });
  }

  async function submit() {
    if (running.current) return;
    if (!email.trim().includes('@') || !password) {
      setError('Informe seu e-mail institucional e a senha.');
      return;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    Keyboard.dismiss();
    try {
      await onLogin(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={styles.logo}>Re<Text style={styles.logoDestaque}>ali</Text></Text>
          <Text style={styles.subtitulo}>Mais controle. Menos desperdício.</Text>
        </View>

        <View style={styles.abas} accessibilityRole="tablist">
          {tabs.map((title, index) => (
            <Pressable key={title} accessibilityRole="tab" accessibilityState={{ selected: tab === index, disabled: busy }}
              disabled={busy} onPress={() => selectTab(index)}
              style={[styles.aba, tab === index && styles.abaSelecionada]}>
              <Text style={[styles.textoAba, tab === index && styles.textoAbaSelecionada]}>{title}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView ref={pages} style={styles.paginas} horizontal pagingEnabled directionalLockEnabled
          showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" scrollEventThrottle={16}
          scrollEnabled={!busy} onScrollBeginDrag={Keyboard.dismiss}
          onLayout={() => pages.current?.scrollTo({ x: width * tab, animated: false })}
          onMomentumScrollEnd={({ nativeEvent }) => setTab(nativeEvent.contentOffset.x >= width / 2 ? 1 : 0)}>
          <ScrollView style={{ width }} contentContainerStyle={styles.formulario}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            aria-hidden={tab !== 0} accessibilityElementsHidden={tab !== 0} importantForAccessibility={tab !== 0 ? 'no-hide-descendants' : 'auto'}>
            <View style={styles.grupo}>
              <Text style={styles.label}>E-mail</Text>
              <Input accessibilityLabel="E-mail para entrar" testID="login-email" editable={!busy}
                style={styles.input} placeholder="voce@escola.gov.br" placeholderTextColor="#667B70"
                value={email} onChangeText={setEmail} keyboardType="email-address"
                autoComplete="email" autoCapitalize="none" autoCorrect={false} />
            </View>

            <View style={styles.grupo}>
              <Text style={styles.label}>Senha</Text>
              <Input accessibilityLabel="Senha para entrar" testID="login-password" editable={!busy}
                style={styles.input} placeholder="••••••" placeholderTextColor="#667B70"
                value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
                autoComplete="current-password" autoCapitalize="none" autoCorrect={false}
                onSubmitEditing={() => void submit()} />
            </View>

            <View style={styles.termos}>
              <Checkbox text="Mostrar senha" checked={showPassword} onChange={setShowPassword} />
            </View>
            {(error ?? sessionError) && <Text accessibilityRole="alert" style={styles.nota}>{error ?? sessionError}</Text>}
            <Button label={busy ? 'Entrando…' : 'Entrar'} testID="login-submit" accessibilityRole="button" style={styles.botao}
              disabled={busy} onPress={() => void submit()} />
            <Pressable accessibilityRole="link" disabled={busy} onPress={onReset} style={styles.recuperar}>
              <Text style={styles.recuperarTexto}>Esqueci minha senha</Text>
            </Pressable>
            <Text style={styles.nota}>O acesso ao Reali é feito por convite da instituição.</Text>
          </ScrollView>

          <ScrollView style={{ width }} contentContainerStyle={styles.formulario}
            aria-hidden={tab !== 1} accessibilityElementsHidden={tab !== 1} importantForAccessibility={tab !== 1 ? 'no-hide-descendants' : 'auto'}>
            <View style={styles.grupo}>
              <Text accessibilityRole="header" style={styles.label}>Ative seu acesso por convite</Text>
              <Text style={styles.instrucao}>
                Abra o link que sua instituição enviou por e-mail para ativar a conta e definir sua senha.
              </Text>
              <Text style={styles.instrucao}>Se precisar de um novo convite, fale com a direção da instituição.</Text>
            </View>
            <Button label="Voltar para entrar" accessibilityRole="button" style={styles.botao}
              onPress={() => selectTab(0)} />
          </ScrollView>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
