import { View, Text, Image, Platform } from 'react-native';
import { Undo2, Settings, Pencil, CircleUser, Phone, MapPin, Lock,type LucideIcon,
} from 'lucide-react-native';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { IconButton } from '../../components/IconButton/IconButton';
import { Header } from '../../components/Header/Header';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const Linha = ({ icone: Icone, texto }: { icone: LucideIcon; texto: string }) => (
  <View style={styles.linha}>
    <Icone size={22} color={colors.text}/>
    <Text style={styles.linhaTexto}>{texto}</Text>
  </View>
);

export default function PerfilUsuario() {
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
              onPress={() => console.log('Voltar')}
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

      <Text style={styles.nome}>Horlando da Silva</Text>
      <Text style={styles.cargo}>Diretor</Text>

      <View style={styles.conteudo}>
        <Card title="Dados pessoais">
          <Linha icone={CircleUser} texto="horlandodiretor@gmail.com" />
          <Linha icone={Phone} texto="(11) 98765-4321" />
          <Linha icone={MapPin} texto="Escola Municipal Novo Horizonte" />
        </Card>

        <Card title="Minha conta">
          <Linha icone={Settings} texto="Editar perfil" />
          <Linha icone={Lock} texto="Alterar Senha" />
        </Card>

        <Button
          label="Sair da conta"
          style={styles.botaoSair}
          textStyle={styles.botaoSairTexto}
          onPress={() => {
            if (Platform.OS === 'web') {
              window.location.href = '/';
            }
          }}
        />
      </View>
    </View>
  );
}