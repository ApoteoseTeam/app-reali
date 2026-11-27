import { Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, House, TrendingUp, History} from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { Header } from '../../components/Header/header';
import { MenuDayCard } from '../../components/MenuDayCard/MenuDayCard';
import { styles } from './styles';

type CardapioSemanaProps = {
    periodo?: string;
    dias?: { dia: string; refeicoes: { nome: string; preparacoes: string[] }[]; planejamento?: number }[];
    onInicioPress?: () => void;
    onRelatoriosPress?: () => void;
    onCardapioPress?: () => void;
    onHistoricoPress?: () => void;
};

export default function CardapioSemanaGestao({
    periodo = "—",
    dias = [],
    onInicioPress,
    onRelatoriosPress,
    onCardapioPress,
    onHistoricoPress
}: CardapioSemanaProps = {}) {

    const abas = [
        { titulo: 'Início', Icone: House, onPress: onInicioPress },
        { titulo: 'Relatórios', Icone: TrendingUp, onPress: onRelatoriosPress },
        { titulo: 'Cardápio', Icone: ClipboardList, ativa: true },
        { titulo: 'Histórico', Icone: History, onPress: onHistoricoPress },
    ];
    return (
        <View style={styles.screen}>
            <Header
                name="Cardápio da semana"
                right={null}
                containerStyle={styles.header}
                titleStyle={styles.title}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
            >
                <Text style={styles.period}>{periodo}</Text>

                {dias.map(({ dia, refeicoes, planejamento }) => (
                    <MenuDayCard
                        key={dia}
                        variante="cozinha"
                        dia={dia}
                        refeicoes={refeicoes}
                        planejamento={planejamento}
                    />
                ))}

                <Card style={styles.measurements}>
                    <Text style={styles.titleMeasures}>
                        Medidas padronizadas da escola
                    </Text>
                    <Text style={styles.textMeasures}>
                        Pacotes, xícaras e unidades cadastrados pela gestão para orientar o preparo.
                    </Text>
                </Card>
            </ScrollView>


            <View style={styles.footer}>
                {abas.filter(aba => aba.ativa || aba.onPress).map(({ titulo, Icone, ativa, onPress }) => {
                    const cor = ativa ? '#C8DFB9' : '#FFFFFF';  // adicionar navegação entre os icones do rodape

                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa }}
                            onPress={onPress}
                            style={styles.tab}
                        >
                            <Icone color={cor} size={22} />
                            <Text style={[styles.textTab, { color: cor }]}>{titulo}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
