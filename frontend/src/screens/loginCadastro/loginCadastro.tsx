import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { styles } from './styles';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';

type LoginProps = {onLogin:(email:string,password:string)=>Promise<void>;onReset:()=>void;sessionError:string|null};
export default function TelaAutenticacao({onLogin,onReset,sessionError}:LoginProps) {
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const running=useRef(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);

  async function handleLogin() {
    if(running.current)return;
    if(!emailLogin.trim().includes("@")||!senhaLogin){setError("Informe seu e-mail institucional e a senha.");return;}
    Keyboard.dismiss();
    running.current=true;
    setBusy(true);
    setError(null);
    try { await onLogin(emailLogin.trim(),senhaLogin); }
    catch (cause) { setError(cause instanceof Error?cause.message:"Não foi possível entrar."); }
    finally { running.current=false;setBusy(false); }
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
            Gestão da merenda escolar
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
              testID="login-email"
              editable={!busy}
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
              testID="login-password"
              editable={!busy}
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

          {(error||sessionError)&&<Text accessibilityRole="alert" style={styles.nota}>{error??sessionError}</Text>}
          <Button label={busy?"Entrando…":"Entrar"} style={styles.botao} disabled={busy} onPress={()=>{void handleLogin();}}/>
          <Button label="Esqueci minha senha" disabled={busy} onPress={onReset}/>

          <Text style={styles.nota}>
            O acesso ao Reali é feito por convite da instituição.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};