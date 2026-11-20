import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, House, UserRound } from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { Logo } from '../../components/Logo/Logo';
import { styles, coresRodape } from './styles';

type HomeCozinhaProps = {
    nome?: string;
    dataTurno?: string;
    presentes?: number;
    totalPlanejado?: number;
    onCardapioPress?: () => void;
    onPerfilPress?: () => void;
};

export default function HomeCozinha({
    nome = 'Letícia',
    dataTurno = 'Segunda, 9 de novembro · Manhã',
    presentes = 400,
    totalPlanejado = 440,
    onCardapioPress,
    onPerfilPress,
}: HomeCozinhaProps = {}) {
    const abas = [
        { titulo: 'Início', Icone: House, ativa: true },
        { titulo: 'Cardápio', Icone: ClipboardList, onPress: onCardapioPress },
        {
            titulo: 'Perfil', Icone: UserRound, onPress: onPerfilPress,
        },
    ];
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
                        <Text style={styles.numero}>{presentes.toLocaleString('pt-BR')}</Text>
                        <Text style={styles.presentes}>presentes</Text>
                    </View>

                    <Text style={styles.planejamento}>
                        Preparar comida para {totalPlanejado.toLocaleString('pt-BR')} alunos
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
                {abas.map(({ titulo, Icone, ativa, onPress }) => {
                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa, disabled: !ativa && !onPress }}
                            disabled={!ativa && !onPress}
                            onPress={onPress}
                            style={styles.aba}
                        >
                            <Icone color={ativa ? coresRodape.ativa : coresRodape.inativa} size={22} />
                            <Text style={[ styles.textoAba,{ color: ativa ? coresRodape.ativa : coresRodape.inativa }, ]}>
                                {titulo}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}