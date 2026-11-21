import { Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, House, TrendingUp, History} from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { Header } from '../../components/Header/Header';
import { MenuDayCard } from '../../components/MenuDayCard/MenuDayCard';
import { styles } from './styles';

const DIAS = [
    { dia: 'SEG · 09/11', preparacoes: ['Arroz', 'feijão', 'omelete'] },
    { dia: 'TER · 10/11', preparacoes: ['Arroz', 'lentilha', 'carne e abóbora'] },
    { dia: 'QUA · 11/11', preparacoes: ['Macarrão', 'frango e legumes'] },
    { dia: 'QUI · 12/11', preparacoes: ['Arroz', 'feijão', 'omelete e salada'] },
    { dia: 'SEX · 13/11', preparacoes: ['Arroz', 'feijão', 'carne e cenoura'] },
];

type CardapioSemanaProps = {
    totalPlanejado?: number;
    onRelatoriosPress?: () => void;
    onCardapioPress?: () => void;
    onHistoricoPress?: () => void;
};

export default function CardapioSemanaGestao({
    totalPlanejado = 440,
    onRelatoriosPress,
    onCardapioPress,
    onHistoricoPress
}: CardapioSemanaProps = {}) {

    const abas = [
        { titulo: 'Início', Icone: House, ativa: true },
        { titulo: 'Relatórios', Icone: TrendingUp, onPress: onRelatoriosPress },
        { titulo: 'Cardápio', Icone: ClipboardList, onPress: onCardapioPress },
        { titulo: 'Histórico', Icone: History, onPress: onHistoricoPress },
    ];
    return (
        <View style={styles.tela}>
            <Header
                name="Cardápio da semana"
                right={null}
                containerStyle={styles.cabecalho}
                titleStyle={styles.titulo}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.conteudo}
            >
                <Text style={styles.periodo}>9 a 13 de novembro · Almoço</Text>

                {DIAS.map(({ dia, preparacoes }) => (
                    <MenuDayCard
                        key={dia}
                        variante="cozinha"
                        dia={dia}
                        refeicoes={[{ nome: 'Almoço', preparacoes }]}
                        planejamento={dia === 'SEG · 09/11' ? totalPlanejado : undefined}
                    />
                ))}

                <Card style={styles.medidas}>
                    <Text style={styles.tituloMedidas}>
                        Medidas padronizadas da escola
                    </Text>
                    <Text style={styles.textoMedidas}>
                        Pacotes, xícaras e unidades cadastrados pela gestão para orientar o preparo.
                    </Text>
                </Card>
            </ScrollView>


            <View style={styles.rodape}>
                {abas.map(({ titulo, Icone, ativa, onPress }) => {
                    const cor = ativa ? '#C8DFB9' : '#FFFFFF';  // adicionar navegação entre os icones do rodape

                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa, disabled: !ativa && !onPress }}
                            disabled={!ativa && !onPress}
                            onPress={onPress}
                            style={styles.aba}
                        >
                            <Icone color={cor} size={22} />
                            <Text style={[styles.textoAba, { color: cor }]}>{titulo}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}