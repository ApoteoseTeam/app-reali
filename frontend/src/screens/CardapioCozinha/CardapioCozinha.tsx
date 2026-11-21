import { Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, House, UserRound } from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { Header } from '../../components/header/header';
import { MenuDayCard } from '../../components/MenuDayCard/MenuDayCard';
import { styles } from './styles';

type CardapioSemanaProps = {
    periodo?: string;
    dias?: { dia: string; refeicoes: { nome: string; preparacoes: string[] }[]; planejamento?: number }[];
    onInicioPress?: () => void;
    onPerfilPress?: () => void;
};

export default function CardapioSemanaCozinha({
    periodo = "—",
    dias = [],
    onInicioPress,
    onPerfilPress,
}: CardapioSemanaProps = {}) {
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
                <Pressable
                    style={styles.aba}
                    accessibilityRole="button"
                    disabled={!onInicioPress}
                    onPress={onInicioPress}
                >
                    <House size={22} color="#FFFFFF" />
                    <Text style={styles.textoAba}>Início</Text>
                </Pressable>

                <View
                    style={styles.aba}
                    accessible
                    accessibilityLabel="Cardápio, tela atual"
                >
                    <ClipboardList size={22} color="#C8DFB9" />
                    <Text style={[styles.textoAba, styles.abaAtiva]}>Cardápio</Text>
                </View>

                <Pressable
                    style={styles.aba}
                    accessibilityRole="button"
                    disabled={!onPerfilPress}
                    onPress={onPerfilPress}
                >
                    <UserRound size={22} color="#FFFFFF" />
                    <Text style={styles.textoAba}>Perfil</Text>
                </Pressable>
            </View>
        </View>
    );
}