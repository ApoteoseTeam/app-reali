import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
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
import {Button} from '../../components/Button/Button';
import {Card} from '../../components/Card/Card';
import { styles } from './styles';

const ABAS: { nome: string; icone: LucideIcon; ativa?: boolean }[] = [
  { nome: 'Home', icone: House },
  { nome: 'Formulário', icone: ClipboardList },
  { nome: 'Dashboard', icone: LayoutDashboard },
  { nome: 'Perfil', icone: CircleUser, ativa: true },
];

const Linha = ({ icone: Icone, texto }: { icone: LucideIcon; texto: string }) => (
  <View style={styles.linha}>
    <Icone size={22} color="#000" />
    <Text style={styles.linhaTexto}>{texto}</Text>
  </View>
);

export default function PerfilUsuario() {
  return (
    <View style={styles.container}>
      <View style={styles.fundoVerde} />

      <View style={styles.topo}>
        <Pressable hitSlop={12}>
          <Undo2 size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.titulo}>MEU PERFIL</Text>
        <Pressable hitSlop={12}>
          <Settings size={24} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.avatarArea}>
        <View style={styles.avatarBorda}>
          <Image source={require('../../assets/perfil.jpeg')} style={styles.avatar} />
        </View>
        <Pressable style={styles.editar}>
          <Pencil size={18} color="#FFF" />
        </Pressable>
      </View>

      <Text style={styles.nome}>Leticia Neves Eduardo</Text>
      <Text style={styles.cargo}>Nutricionista</Text>

      <View style={styles.conteudo}>
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Dados pessoais</Text>
          <Linha icone={CircleUser} texto="leticia@gmail.com" />
          <Linha icone={Phone} texto="(11) 98765-4321" />
          <Linha icone={MapPin} texto="Escola Municipal Novo Horizonte" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Minha conta</Text>
          <Linha icone={Settings} texto="Editar perfil" />
          <Linha icone={Lock} texto="Alterar Senha" />
        </View>

        <Pressable style={styles.botaoSair}>
          <Text style={styles.cardTitulo}>Sair da conta</Text>
        </Pressable>
      </View>

      <View style={styles.abas}>
        {ABAS.map(({ nome, icone: Icone, ativa }) => (
          <Pressable key={nome} style={styles.aba}>
            <Icone size={24} color="#000" strokeWidth={ativa ? 2.6 : 2} />
            <Text style={styles.abaTexto}>{nome}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

