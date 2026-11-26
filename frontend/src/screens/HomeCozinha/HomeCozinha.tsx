import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, History, House, TrendingUp, UserRound } from 'lucide-react-native';

import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { styles, coresRodape } from './styles';

type HomeCozinhaProps = {
    nome?: string;
    dataTurno?: string;
    presentes?: number | null;
    totalPlanejado?: number | null;
    showForecast?: boolean;
    onCardapioPress?: () => void;
    onPerfilPress?: () => void;
    onHistoricoPress?: () => void;
    onRelatoriosPress?: () => void;
    onAssistentePress?: () => void;
};

export default function HomeCozinha({
    nome = '—',
    dataTurno = '—',
    presentes = null,
    totalPlanejado = null,
    showForecast = true,
    onCardapioPress,
    onPerfilPress,
    onHistoricoPress,
    onRelatoriosPress,
    onAssistentePress,
}: HomeCozinhaProps = {}) {
    const abas = [
        { titulo: 'Início', Icone: House, ativa: true },
        { titulo: 'Cardápio', Icone: ClipboardList, onPress: onCardapioPress },
        { titulo: 'Histórico', Icone: History, onPress: onHistoricoPress },
        { titulo: 'Relatórios', Icone: TrendingUp, onPress: onRelatoriosPress },
        {
            titulo: 'Perfil', Icone: UserRound, onPress: onPerfilPress,
        },
    ];
    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Image style={styles.logo} source={require ('../../assets/r-logotipo-branca.png')}></Image>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
            >
                <View style={styles.greeting}>
                    <Text accessibilityRole="header" style={styles.title}>
                        Olá, {nome}
                    </Text>
                    <Text style={styles.date}>{dataTurno}</Text>
                </View>

                <Card style={styles.card}>
                    <View>
                        <Text style={styles.label}>ALUNOS DE HOJE</Text>
                        <Text style={styles.number}>{presentes?.toLocaleString('pt-BR') ?? '—'}</Text>
                        <Text style={styles.presence}>entradas registradas</Text>
                    </View>

                    {showForecast && <Text style={styles.planning}>
                        Preparar comida para {totalPlanejado?.toLocaleString('pt-BR') ?? '—'} alunos
                    </Text>}

                    <Image
                        source={require('../../assets/pratos-de-comida.jpg')} //alterar foto posteriomente, e adicionar fotos variaveis pelo turno e dia da semana
                        style={styles.photo}
                        resizeMode="cover"
                        accessible={false}
                    />
                </Card>
                {onAssistentePress && <Button label="Abrir assistente virtual" onPress={onAssistentePress} />}
            </ScrollView>

            <View style={styles.footer}>
                {abas.filter(aba => aba.ativa || aba.onPress).map(({ titulo, Icone, ativa, onPress }) => {
                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa }}
                            onPress={onPress}
                            style={styles.tab}
                        >
                            <Icone color={ativa ? coresRodape.ativa : coresRodape.inativa} size={22} />
                            <Text style={[ styles.textTab,{ color: ativa ? coresRodape.ativa : coresRodape.inativa }, ]}>
                                {titulo}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
