import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { styles } from './styles';
import { Checkbox } from '../../components/CheckBox/CheckBox';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';

export default function TelaAutenticacao() {
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [termosLogin, setTermosLogin] = useState(false);

  function handleLogin() {
    Keyboard.dismiss();

    Alert.alert(
      'Demonstração',
      'A integração de login ainda será implementada.'
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={styles.logo}>
            Re<Text style={styles.logoDestaque}>ali</Text>
          </Text>

          <Text style={styles.subtitulo}>
            Mais controle. Menos desperdício.
          </Text>
        </View>

        <ScrollView
          style={styles.paginas}
          contentContainerStyle={styles.formulario}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grupo}>
            <Text style={styles.label}>E-mail</Text>

            <Input
              accessibilityLabel="E-mail para entrar"
              style={styles.input}
              placeholder="voce@escola.gov.br"
              placeholderTextColor="#667B70"
              value={emailLogin}
              onChangeText={setEmailLogin}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.grupo}>
            <Text style={styles.label}>Senha</Text>

            <Input
              accessibilityLabel="Senha para entrar"
              style={styles.input}
              placeholder="••••••"
              placeholderTextColor="#667B70"
              value={senhaLogin}
              onChangeText={setSenhaLogin}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.termos}>
            <Checkbox
              text="Li e aceito os termos e a política de privacidade."
              checked={termosLogin}
              onChange={setTermosLogin}
            />
          </View>

          <Button
            label="Entrar"
            style={styles.botao}
            onPress={handleLogin}
          />

          <Text style={styles.nota}>
            O acesso ao Reali é feito por convite da instituição.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};