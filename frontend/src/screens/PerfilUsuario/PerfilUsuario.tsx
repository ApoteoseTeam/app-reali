import { View, Text, Image, Platform, TouchableOpacity } from 'react-native';
import { Undo2, Settings, Pencil, CircleUser, Phone, MapPin, Lock, type LucideIcon } from 'lucide-react-native';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { Header } from '../../components/Header/Header';
import { colors } from '../../theme/colors';
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
            onPress={() => console.log('Editar foto do perfil')}
          />
        </View>
      </View>

      <Text style={styles.nome}>Horlando da Silva</Text>
      <Text style={styles.cargo}>Diretor</Text>

      <View style={styles.conteudo}>
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Dados pessoais</Text>
          <Linha icone={CircleUser} texto="horlandodiretor@gmail.com" />
          <Linha icone={Phone} texto="(11) 98765-4321" />
          <Linha icone={MapPin} texto="Escola Municipal Novo Horizonte" />
        </View>

        <View style={[styles.card, styles.cardConta]}>
          <Text style={styles.cardTitulo}>Minha conta</Text>
          <Linha
            icone={Settings}
            texto="Editar perfil"
            onPress={() => console.log('Editar perfil')}
          />
          <Linha
            icone={Lock}
            texto="Alterar Senha"
            onPress={() => console.log('Alterar Senha')}
          />
        </View>

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