import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  Image,
  type TextInputProps,
} from 'react-native';
import { useSession } from '../../session/provider';
import { Eye, EyeOff } from 'lucide-react-native';
import { IconButton } from '../../components/IconButton/IconButton';
import { styles } from './styles';
import { Checkbox } from '../../components/CheckBox/CheckBox';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';

function CampoSenha({ style, ...props }: TextInputProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <View>
      <Input
        {...props}
        style={[style, styles.inputWithEye]}
        secureTextEntry={!visivel}
      />
      <IconButton
        icon={visivel ? EyeOff : Eye}
        accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        onPress={() => setVisivel(valor => !valor)}
        color="#14385F"
        size={20}
        style={styles.passwordEye}
      />
    </View>
  );
}


export default function TelaAutenticacao() {
  const session = useSession();
  const loginEmAndamento = useRef(false);
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [termosLogin, setTermosLogin] = useState(false);

  async function handleLogin() {
    if (loginEmAndamento.current || session.selecting || session.status === "INITIALIZING") return;
    Keyboard.dismiss();
    if (!emailLogin.trim() || !senhaLogin || !termosLogin) {
      Alert.alert('Confira os dados', 'Informe o e-mail, a senha e aceite os termos.');
      return;
    }

    loginEmAndamento.current = true;
    try {
      await session.signIn(emailLogin.trim(), senhaLogin);
    } catch (error) {
      Alert.alert('Falha no login', error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      loginEmAndamento.current = false;
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Image source={require('../../assets/reali-branco.png')} style={styles.logo} resizeMode="contain"/>
          </Text>

          <Text style={styles.subtitle}>
            Mais controle. Menos desperdício.
          </Text>
        </View>

        <ScrollView
          style={styles.pages}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.group}>
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

          <View style={styles.group}>
            <Text style={styles.label}>Senha</Text>

            <CampoSenha
              accessibilityLabel="Senha para entrar"
              style={styles.input}
              placeholder="••••••"
              placeholderTextColor="#667B70"
              value={senhaLogin}
              onChangeText={setSenhaLogin}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.terms}>
            <Checkbox
              text="Li e aceito os termos e a política de privacidade."
              checked={termosLogin}
              onChange={setTermosLogin}
            />
          </View>

          <Button
            label="Entrar"
            style={styles.button}
            onPress={handleLogin}
          />

          <Text style={styles.note}>
            Não coletamos dados de alunos. Só pesos por preparação.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
