import { Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, House, TrendingUp, History} from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { Header } from '../../components/header/header';
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
                <Text style={styles.periodo}>{periodo}</Text>

                {dias.map(({ dia, refeicoes, planejamento }) => (
                    <MenuDayCard
                        key={dia}
                        variante="cozinha"
                        dia={dia}
                        refeicoes={refeicoes}
                        planejamento={planejamento}
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