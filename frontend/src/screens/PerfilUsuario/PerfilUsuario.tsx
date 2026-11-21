import { View, Text, Image, Pressable } from 'react-native';
import {
  Undo2,
  Settings,
  Pencil,
  CircleUser,
  Phone,
  MapPin,
  Lock,
  House,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { IconButton } from '../../components/IconButton/IconButton';
import { Header } from '../../components/header/header';
import { colors } from '../../theme/colors';
import { roleNames } from '../../api/reali';
import { useSession } from '../../session/provider';
import { styles } from './styles';

const ABAS: { nome: string; icone: LucideIcon; ativa?: boolean }[] = [
  { nome: 'Home', icone: House },
  { nome: 'Formulário', icone: ClipboardList },
  { nome: 'Dashboard', icone: LayoutDashboard },
  { nome: 'Perfil', icone: CircleUser, ativa: true },
];

const Linha = ({ icone: Icone, texto }: { icone: LucideIcon; texto: string }) => (
  <View style={styles.linha}>
    <Icone size={22} color={colors.text} />
    <Text style={styles.linhaTexto}>{texto}</Text>
  </View>
);

type Props = { onInicio?: () => void; onCardapio?: () => void; onRelatorio?: () => void };

export default function PerfilUsuario({ onInicio, onCardapio, onRelatorio }: Props = {}) {
  const { me, workspace, signOut } = useSession();
  const actions: Record<string, (() => void) | undefined> = {
    Home: onInicio, Formulário: onCardapio, Dashboard: onRelatorio,
  };
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
              onPress={() => onInicio?.()}
            />
          }
          right={
            <IconButton
              icon={Settings}
              color={colors.white}
              size={24}
              style={styles.iconeTopo}
              accessibilityLabel="Configurações"
              onPress={() => console.log('Configurações')}
            />
          }
        />

        <View style={styles.avatarArea}>
          <View style={styles.avatarBorda}>
            <Image source={require('../../assets/perfil.jpeg')} style={styles.avatar} />
          </View>
          <IconButton
            icon={Pencil}
            color={colors.white}
            size={18}
            style={styles.editar}
            accessibilityLabel="Editar foto do perfil"
            onPress={() => console.log('Editar foto do perfil')}
          />
        </View>
      </View>

      <Text style={styles.nome}>{me?.user.full_name || me?.user.email || "—"}</Text>
      <Text style={styles.cargo}>{role ? roleNames[role] ?? role : "—"}</Text>

      <View style={styles.conteudo}>
        <Card title="Dados pessoais">
          <Linha icone={CircleUser} texto={me?.user.email ?? "—"} />
          <Linha icone={Phone} texto="—" />
          <Linha icone={MapPin} texto={[workspace?.school?.name, workspace?.organization.name].filter(Boolean).join(" · ") || "—"} />
        </Card>

        <Card title="Minha conta">
          <Linha icone={Settings} texto="Editar perfil" />
          <Linha icone={Lock} texto="Alterar Senha" />
        </Card>

        <Button
          label="Sair da conta"
          style={styles.botaoSair}
          textStyle={styles.botaoSairTexto}
          onPress={signOut}
        />
      </View>

      <View style={styles.abas}>
        {ABAS.map(({ nome, icone: Icone, ativa }) => (
          <Pressable key={nome} style={styles.aba} onPress={actions[nome]}>
            <Icone size={24} color={colors.text} strokeWidth={ativa ? 2.6 : 2} />
            <Text style={styles.abaTexto}>{nome}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}