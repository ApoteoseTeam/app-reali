import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSession } from '../../session/provider';
import { styles } from './styles';
import { Checkbox } from '../../components/CheckBox/CheckBox';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { Select } from "../../components/select/Select";
// import { Header } from '../components/header';

type Funcao = 'Nutricionista' | 'Gestor';
type Aba = 0 | 1;

export default function TelaAutenticacao({ abaInicial = 0 }: { abaInicial?: Aba } = {}) {
  const session = useSession();
  const loginEmAndamento = useRef(false);
  const { width: larguraJanela } = useWindowDimensions();
  const paginasRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [largura, setLargura] = useState(larguraJanela);
  const [abaAtiva, setAbaAtiva] = useState<Aba>(abaInicial);

  // Estados do login
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [termosLogin, setTermosLogin] = useState(false);

  // Estados do cadastro
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [escola, setEscola] = useState('');
  const [funcao, setFuncao] = useState<Funcao>('Nutricionista');
  const [senha, setSenha] = useState('');
  const [termosCadastro, setTermosCadastro] = useState(false);

  const [tentouCadastrar, setTentouCadastrar] = useState(false);

  const senhaInvalida = tentouCadastrar && senha.length < 8;

  function trocarAba(aba: Aba) {
    Keyboard.dismiss();
    setAbaAtiva(aba);

    paginasRef.current?.scrollTo({
      x: largura * aba,
      animated: true,
    });
  }

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

  function handleCadastro() {
    Keyboard.dismiss();
    setTentouCadastrar(true);

    if (!nome.trim() || !email.trim() || !escola.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos.');
      return;
    }

    if (senha.length < 8) {
      Alert.alert('Confira a senha', 'Use ao menos 8 caracteres.');
      return;
    }

    if (!termosCadastro) {
      Alert.alert(
        'Termos de uso',
        'Aceite os termos e a política de privacidade para continuar.'
      );
      return;
    }

    Alert.alert(
      'Cadastro indisponível',
      'O acesso é liberado por convite da instituição.'
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={styles.conteudo}
        onLayout={({ nativeEvent }) => {
          const novaLargura = nativeEvent.layout.width;

          if (novaLargura !== largura) {
            setLargura(novaLargura);

            paginasRef.current?.scrollTo({
              x: novaLargura * abaAtiva,
              animated: false,
            });
          }
        }}
      >
        {/* Substituir este bloco pelo Header quando estiver pronto. */}
        {/* <Header /> */}

        <View style={styles.cabecalho}>
          <Text style={styles.logo}>
            Re<Text style={styles.logoDestaque}>ali</Text>
          </Text>

          <Text style={styles.subtitulo}>
            Mais controle. Menos desperdício.
          </Text>
        </View>

        <View style={styles.abas} accessibilityRole="tablist">
          {(['Entrar', 'Criar conta'] as const).map((titulo, indice) => {
            const aba = indice as Aba;
            const selecionada = abaAtiva === aba;

            return (
              <Pressable
                key={titulo}
                accessibilityRole="tab"
                accessibilityState={{ selected: selecionada }}
                onPress={() => trocarAba(aba)}
                style={[
                  styles.aba,
                  selecionada && styles.abaSelecionada,
                ]}
              >
                <Text
                  style={[
                    styles.textoAba,
                    selecionada && styles.textoAbaSelecionada,
                  ]}
                >
                  {titulo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={paginasRef}
          contentOffset={{ x: largura * abaInicial, y: 0 }}
          style={styles.paginas}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScrollBeginDrag={Keyboard.dismiss}
          onScroll={({ nativeEvent }) => {
            const indice = Math.round(
              nativeEvent.contentOffset.x / largura
            );

            setAbaAtiva(indice >= 1 ? 1 : 0);
          }}
        >
          {/* ENTRAR */}
          <ScrollView
            style={{ width: largura }}
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
              Não coletamos dados de alunos. Só pesos por preparação.
            </Text>
          </ScrollView>

          {/* CADASTRO */}
          <ScrollView
            style={{ width: largura }}
            contentContainerStyle={styles.formulario}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grupo}>
              <Text style={styles.label}>Nome completo</Text>

              <Input
                accessibilityLabel="Nome completo"
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#667B70"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.grupo}>
              <Text style={styles.label}>E-mail</Text>

              <Input
                accessibilityLabel="E-mail para cadastro"
                style={styles.input}
                placeholder="voce@escola.gov.br"
                placeholderTextColor="#667B70"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.grupo}>
              <Text style={styles.label}>Escola ou rede</Text>

              <Input
                accessibilityLabel="Escola ou rede"
                style={styles.input}
                placeholder="Nome da escola ou da rede"
                placeholderTextColor="#667B70"
                value={escola}
                onChangeText={setEscola}
                autoCapitalize="sentences"
              />
            </View>

            <View style={styles.grupo}>
              <Select
                label="Função"
                options={["Nutricionista", "Gestor"]}
                value={funcao}
                onChange={(valor) => setFuncao(valor as Funcao)}
              />
            </View>

            <View style={styles.grupoSenha}>
              <Text style={styles.label}>Senha</Text>

              <Input
                accessibilityLabel="Senha para cadastro"
                style={[
                  styles.input,
                  senhaInvalida && styles.inputErro,
                ]}
                placeholder="••••••"
                placeholderTextColor="#667B70"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text
                style={[
                  styles.ajuda,
                  senhaInvalida && styles.textoErro,
                ]}
              >
                Use ao menos 8 caracteres.
              </Text>
            </View>

            <View style={styles.termos}>
              <Checkbox
                text="Li e aceito os termos e a política de privacidade."
                checked={termosCadastro}
                onChange={setTermosCadastro}
              />
            </View>

            <Button
              label="Criar conta"
              style={styles.botao}
              onPress={handleCadastro}
            />

            <Text style={styles.nota}>
              Não coletamos dados de alunos. Só pesos por preparação.
            </Text>
          </ScrollView>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};