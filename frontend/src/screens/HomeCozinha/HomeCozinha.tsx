import { Image, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/Card/Card';
import { styles } from './styles';

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
}: HomeCozinhaProps = {}) {
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
            </ScrollView>
        </View>
    );
}
