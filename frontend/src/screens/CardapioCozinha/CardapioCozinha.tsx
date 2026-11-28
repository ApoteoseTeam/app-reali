import { ScrollView, Text, View } from 'react-native';

import { Card } from '../../components/Card/Card';
import { Header } from '../../components/Header/header';
import { MenuDayCard } from '../../components/MenuDayCard/MenuDayCard';
import { styles } from './styles';

type CardapioSemanaProps = {
    periodo?: string;
    dias?: { dia: string; refeicoes: { nome: string; preparacoes: string[] }[]; planejamento?: number }[];
    onInicioPress?: () => void;
    onPerfilPress?: () => void;
    onHistoricoPress?: () => void;
    onCardapioPress?: () => void;
    onRelatorioPress?: () => void;
};

export default function CardapioSemanaCozinha({
    periodo = "—",
    dias = [],
    onCardapioPress,
    onRelatorioPress,
}: CardapioSemanaProps = {}) {
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
        </View>
    );
}
