import { View, Text, Image, Alert, TouchableOpacity } from 'react-native';
import { Undo2, Settings, Pencil, CircleUser, Phone, MapPin, Lock, type LucideIcon } from 'lucide-react-native';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { Header } from '../../components/header/header';
import { colors } from '../../theme/colors';
import { useSession } from '../../session/provider';
import { roleNames } from '../../api/reali';
import { styles } from './styles';

type LinhaProps = {
  icone: LucideIcon;
  texto: string;
  onPress?: () => void;
};


const Linha = ({ icone: Icone, texto, onPress }: LinhaProps) => {
  const conteudo = (
    <>
      <Icone size={20} color={colors.primary} />
      <Text style={styles.linhaTexto}>{texto}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.linha}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {conteudo}
      </TouchableOpacity>
    );
  }

  return <View style={styles.linha}>{conteudo}</View>;
};

export default function PerfilUsuario({ onVoltar }: { onVoltar?: () => void } = {}) {
  const { me, workspace, signOut } = useSession();
  const unavailable = () => Alert.alert('Recurso indisponível nesta versão');
  const role = workspace?.member.role;
  return (
    <View style={styles.container}>
      <View style={styles.perfilTopo}>
        <View style={styles.fundoTopo} />

        <Header
          name="MEU PERFIL"
          containerStyle={styles.topo}
          titleStyle={styles.titulo}
          left={
            <IconButton
              icon={Undo2}
              color={colors.white}
              size={24}
              style={styles.iconeTopo}
              accessibilityLabel="Voltar"
              onPress={() => onVoltar?.()}
            />
          }
          right={<View style={styles.iconeEspacador} />}
        />

        <View style={styles.avatarArea}>
          <View style={styles.avatarBorda}>
            <Image source={require('../../assets/perfil.jpeg')} style={styles.avatar} />
          </View>
          <IconButton
            icon={Pencil}
            color={colors.white}
            size={16}
            style={styles.editar}
            accessibilityLabel="Editar foto do perfil"
            onPress={unavailable}
          />
        </View>
      </View>

      <Text style={styles.nome}>{me?.user.full_name || me?.user.email || "—"}</Text>
      <Text style={styles.cargo}>{role ? roleNames[role] ?? role : "—"}</Text>

      <View style={styles.conteudo}>
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Dados pessoais</Text>
          <Linha icone={CircleUser} texto={me?.user.email ?? "—"} />
          <Linha icone={Phone} texto="—" />
          <Linha icone={MapPin} texto={workspace?.school?.name ?? "—"} />
        </View>

        <View style={[styles.card, styles.cardConta]}>
          <Text style={styles.cardTitulo}>Minha conta</Text>
          <Linha
            icone={Settings}
            texto="Editar perfil"
            onPress={unavailable}
          />
          <Linha
            icone={Lock}
            texto="Alterar Senha"
            onPress={unavailable}
          />
        </View>

        <Button
          label="Sair da conta"
          style={styles.botaoSair}
          textStyle={styles.botaoSairTexto}
          onPress={signOut}
        />
      </View>
    </View>
  );
}