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
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { IconButton } from '../../components/IconButton/IconButton';
import { Header } from '../../components/header/header';
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
      <View style={styles.perfilTopo}>
        <View style={styles.fundoVerde} />

        <Header
          name="MEU PERFIL"
          containerStyle={styles.topo}
          titleStyle={styles.titulo}
          left={
            <IconButton
              icon={Undo2}
              color="#FFF"
              size={24}
              style={{ padding: 4 }}
              accessibilityLabel="Voltar"
              onPress={() => console.log('Voltar')}
            />
          }
          right={
            <IconButton
              icon={Settings}
              color="#FFF"
              size={24}
              style={{ padding: 4 }}
              accessibilityLabel="Configurações"
              onPress={() => console.log('Configurações')}
            />
          }
        />
        {/*onPress precisa ser passada funcoes de navegacao ou edicao*/}
        <View style={styles.avatarArea}>
          <View style={styles.avatarBorda}>
            <Image source={require('../../assets/perfil.jpeg')} style={styles.avatar} />
          </View>
          <IconButton
            icon={Pencil}
            color="#FFF"
            size={18}
            style={styles.editar}
            accessibilityLabel="Editar foto do perfil"
            onPress={() => console.log('Editar foto do perfil')}
          />
          {/*onPress precisa ser passada funcoes de navegacao ou edicao*/}
        </View>
      </View>

      <Text style={styles.nome}>Leticia Neves Eduardo</Text>
      <Text style={styles.cargo}>Nutricionista</Text>

      <View style={styles.conteudo}>
        <Card title="Dados pessoais">
          <Linha
            icone={CircleUser}
            texto="leticia@gmail.com"
          />

          <Linha
            icone={Phone}
            texto="(11) 98765-4321"
          />

          <Linha
            icone={MapPin}
            texto="Escola Municipal Novo Horizonte"
          />
        </Card>

        <Card title="Minha conta">
          <Linha icone={Settings} texto="Editar perfil" />
          <Linha icone={Lock} texto="Alterar Senha" />
        </Card>

        <Button
          label="Sair da conta"
          style={styles.botaoSair}
          textStyle={styles.cardTitulo}
          onPress={() => {
            if (Platform.OS === 'web') {
              window.location.href = '/'; {/*A funcao logout verdadeira precisa ser adicionada*/ }
            }
          }}
        />
      </View>

      {/*O componente footer precisa ser inserido e substituir todas essa View style.abas*/}
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

