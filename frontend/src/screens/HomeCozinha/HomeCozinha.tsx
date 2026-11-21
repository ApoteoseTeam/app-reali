import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, House, UserRound } from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { Logo } from '../../components/Logo/Logo';
import { styles } from './styles';

type HomeCozinhaProps = {
    nome?: string;
    dataTurno?: string;
    presentes?: number | null;
    totalPlanejado?: number | null;
    onCardapioPress?: () => void;
    onPerfilPress?: () => void;
};

export default function HomeCozinha({
    nome = '—',
    dataTurno = '—',
    presentes = null,
    totalPlanejado = null,
    onCardapioPress,
    onPerfilPress,
}: HomeCozinhaProps = {}) {
    return (
        <View style={styles.tela}>
            <View style={styles.cabecalho}>
                <Logo style={styles.logo} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.conteudo}
            >
                <View style={styles.saudacao}>
                    <Text accessibilityRole="header" style={styles.titulo}>
                        Olá, {nome}
                    </Text>
                    <Text style={styles.data}>{dataTurno}</Text>
                </View>

                <Card style={styles.cartao}>
                    <View>
                        <Text style={styles.rotulo}>ALUNOS DE HOJE</Text>
                        <Text style={styles.numero}>{presentes?.toLocaleString('pt-BR') ?? '—'}</Text>
                        <Text style={styles.presentes}>entradas registradas</Text>
                    </View>

                    <Text style={styles.planejamento}>
                        Preparar comida para {totalPlanejado?.toLocaleString('pt-BR') ?? '—'} alunos
                    </Text>

                    <Image
                        source={require('../../assets/pratoimg.png')} //alterar foto posteriomente, e adicionar fotos variaveis pelo turno e dia da semana
                        style={styles.foto}
                        resizeMode="cover"
                        accessible={false}
                    />
                </Card>
            </ScrollView>

            <View style={styles.rodape}>
                <View
                    accessible
                    accessibilityRole="tab"
                    accessibilityLabel="Início"
                    accessibilityState={{ selected: true }}
                    style={styles.aba}
                >
                    <House size={22} color="#C8DFB9" />
                    <Text style={[styles.textoAba, styles.abaAtiva]}>Início</Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir cardápio"
                    disabled={!onCardapioPress}
                    onPress={onCardapioPress}
                    style={styles.aba}
                >
                    <ClipboardList size={22} color="#FFFFFF" />
                    <Text style={styles.textoAba}>Cardápio</Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir perfil"
                    disabled={!onPerfilPress}
                    onPress={onPerfilPress}
                    style={styles.aba}
                >
                    <UserRound size={22} color="#FFFFFF" />
                    <Text style={styles.textoAba}>Perfil</Text>
                </Pressable>
            </View>
        </View>
    );
}