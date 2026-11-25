import { useRef, useState } from 'react';
import { View, Text, Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Undo2, Settings, Pencil, CircleUser, Phone, MapPin, Lock, type LucideIcon } from 'lucide-react-native';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { Header } from '../../components/header/header';
import { colors } from '../../theme/colors';
import { api, useSession } from '../../session/provider';
import { roleNames } from '../../api/reali';
import { styles } from './styles';
import { LogoutModal } from '../../components/LogoutModal/LogoutModal';

type LinhaProps = {
  icone: LucideIcon;
  texto: string;
  onPress?: () => void;
};


const Linha = ({ icone: Icone, texto, onPress }: LinhaProps) => {
  const conteudo = (
    <>
      <Icone size={20} color={colors.primary} />
      <Text style={styles.lineText}>{texto}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.line}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {conteudo}
      </TouchableOpacity>
    );
  }

  return <View style={styles.line}>{conteudo}</View>;
};

export default function PerfilUsuario({ onVoltar }: { onVoltar?: () => void } = {}) {
  const { me, workspace, signOut, updateProfile } = useSession();
  const [editor, setEditor] = useState<'profile' | 'password' | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const running = useRef(false);
  const role = workspace?.member.role;
  const photo = me?.user.profile_photo;
  const [logoutVisible, setLogoutVisible] = useState(false);

  function openEditor(next: typeof editor) {
    if (running.current) return;
    setName(me?.user.full_name ?? '');
    setCurrentPassword('');
    setPassword('');
    setConfirmation('');
    setMessage('');
    setEditor(next);
  }

  async function run(operation: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    try {
      await operation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  function changePhoto() {
    void run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.6,
      });
      if (result.canceled) return;
      const photo = result.assets[0]?.base64;
      if (!photo) throw new Error('Não foi possível ler a foto selecionada.');
      if (photo.length > 2_000_000) throw new Error('Selecione uma imagem de até 1,5 MB.');
      await updateProfile({ profile_photo: photo });
      setMessage('Foto atualizada.');
    });
  }

  function saveProfile() {
    void run(async () => {
      if (!name.trim()) throw new Error('Informe seu nome.');
      await updateProfile({ full_name: name.trim() });
      setEditor(null);
      setMessage('Perfil atualizado.');
    });
  }

  function savePassword() {
    void run(async () => {
      if (!currentPassword) throw new Error('Informe sua senha atual.');
      if (password.length < 12) throw new Error('A nova senha deve ter pelo menos 12 caracteres.');
      if (password !== confirmation) throw new Error('As senhas devem coincidir.');
      await api.changePassword(currentPassword, password, confirmation);
      await signOut();
    });
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topProfile}>
        <View style={styles.topBackground} />
        
        <Header
          name="MEU PERFIL"
          containerStyle={styles.top}
          titleStyle={styles.title}
          left={
            <IconButton
              icon={Undo2}
              color={colors.white}
              size={24}
              style={styles.topIcon}
              accessibilityLabel="Voltar"
              onPress={() => onVoltar?.()}
            />
          }
          right={<View style={styles.iconSpacer} />}
        />

        <View style={styles.avatarArea}>
          
          <View style={styles.avatarBorder}>
            <Image 
              source={photo ? { uri: 'data:image/jpeg;base64,' + photo } : require('../../assets/foto-de-perfil.jpg')}
              style={styles.avatar} />

          </View>
          <IconButton
            icon={Pencil}
            color={colors.white}
            size={16}
            style={styles.edit}
            accessibilityLabel="Alterar foto"
            onPress={changePhoto}
          />
        </View>
      </View>

      <Text style={styles.name}>{me?.user.full_name || me?.user.email || "—"}</Text>
      <Text style={styles.position}>{role ? roleNames[role] ?? role : "—"}</Text>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados pessoais</Text>
          <Linha icone={CircleUser} texto={me?.user.email ?? "—"} />
          <Linha icone={Phone} texto="—" />
          <Linha icone={MapPin} texto={workspace?.school?.name ?? "—"} />
        </View>

        <View style={[styles.card, styles.cardAccount]}>
          <Text style={styles.cardTitle}>Minha conta</Text>
          <Linha
            icone={Settings}
            texto="Editar perfil"
            onPress={() => openEditor('profile')}
          />
          <Linha
            icone={Lock}
            texto="Editar senha"
            onPress={() => openEditor('password')}
          />
        </View>

        {editor && (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>{editor === 'profile' ? 'Editar perfil' : 'Editar senha'}</Text>
            {editor === 'profile' ? (
              <>
                <Text>Nome completo</Text>
                <TextInput accessibilityLabel="Nome completo" autoComplete="name" style={styles.input}
                  value={name} onChangeText={setName} maxLength={160} editable={!busy} />
              </>
            ) : (
              <>
                <Text>Senha atual</Text>
                <TextInput accessibilityLabel="Senha atual" autoComplete="current-password" style={styles.input}
                  value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry maxLength={256} editable={!busy} />
                <Text>Nova senha (mínimo de 12 caracteres)</Text>
                <TextInput accessibilityLabel="Nova senha" autoComplete="new-password" style={styles.input}
                  value={password} onChangeText={setPassword} secureTextEntry maxLength={256} editable={!busy} />
                <Text>Confirme a nova senha</Text>
                <TextInput accessibilityLabel="Confirme a nova senha" autoComplete="new-password" style={styles.input}
                  value={confirmation} onChangeText={setConfirmation} secureTextEntry maxLength={256} editable={!busy} />
                <Text>Você precisará entrar novamente após salvar.</Text>
              </>
            )}
            <Button label="Salvar" disabled={busy} onPress={editor === 'profile' ? saveProfile : savePassword} />
            <Button label="Cancelar" disabled={busy} onPress={() => openEditor(null)} />
          </View>
        )}
        {(busy || message) && <Text accessibilityLiveRegion="polite">{busy ? 'Processando…' : message}</Text>}
        <Button
          label="Sair da conta"
          style={styles.exitButton}
          textStyle={styles.exitButtonText}
          onPress={() => setLogoutVisible(true)}
          disabled={busy}
        />

        <LogoutModal
          visible={logoutVisible}
          onCancel={() => setLogoutVisible(false)}
          onConfirm={() => {
            setLogoutVisible(false);
            void run(signOut);
          }}
        />
      </View>
    </ScrollView>
  );
}
