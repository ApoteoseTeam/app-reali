import { Pressable, ScrollView, Text, View,Image } from 'react-native';
import { ClipboardList, History, House, MessageCircle, TrendingUp, UserRound} from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { IconButton } from '../../components/IconButton/IconButton';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { styles } from './styles';

type HomeProps = {
    resumo?: Resumo;
    onPerfilPress?: () => void;
    onAssistentePress?: () => void;
    onRelatoriosPress?: () => void;
    onCardapioPress?: () => void;
    onHistoricoPress?: () => void;
};

type Resumo = {
    nome: string; escola: string; data: string; alunos: number | null;
    refeicoesServidas: number | null; refeicao: string; cardapio: string; consumo: string; aviso: string;
};

export default function Home({
    resumo,
    onPerfilPress,
    onAssistentePress,
    onRelatoriosPress,
    onCardapioPress,
    onHistoricoPress,
}: HomeProps = {}) {
    const abas = [
        { titulo: 'Início', Icone: House, ativa: true },
        { titulo: 'Relatórios', Icone: TrendingUp, onPress: onRelatoriosPress },
        { titulo: 'Cardápio', Icone: ClipboardList, onPress: onCardapioPress },
        { titulo: 'Histórico', Icone: History, onPress: onHistoricoPress },
    ];

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Image style={styles.logo} source={require ('../../assets/r-logotipo-branca.png')}></Image>  

                <IconButton //adicionar imagem real de uma pessoal
                    icon={UserRound}
                    size={19}
                    color="#FFFFFF"
                    accessibilityLabel="Abrir perfil"
                    onPress={() => onPerfilPress?.()}
                    style={styles.profile}
                />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
            >
                <View style={styles.greeting}>
                    <Text accessibilityRole="header" style={styles.title}>
                        Bom dia, {resumo?.nome}
                    </Text>
                    <Text style={styles.secundaryText}>{resumo?.escola}</Text>
                </View>

                <View style={styles.indicator}>
                    <Text style={styles.date}>{resumo?.data}</Text>
                    <Kpicard
                        variant="gestao"
                        title="Alunos registrados"
                        value={resumo?.alunos ?? null}
                    />
                </View>

                <View style={styles.indicator}>
                    <Text style={styles.date}>{resumo?.data}</Text>
                    <Kpicard
                        variant="gestao"
                        title="Refeições servidas"
                        value={resumo?.refeicoesServidas ?? null}
                    />
                </View>

                <Card style={styles.snack}>
                    <Text style={styles.secundaryText}>Refeição do dia</Text>
                    <Text style={styles.titleSnack}>{resumo?.refeicao}</Text>
                    <Text style={styles.textSnack}>
                        {resumo?.cardapio} · {resumo?.consumo}
                    </Text>
                </Card>

                <View style={styles.alert}>
                    <Text style={styles.textAlert}>
                        <Text style={styles.bold}>Ponto de atenção: </Text>
                        {resumo?.aviso}
                    </Text>
                </View>

                <View style={styles.assistent}>
                    <Text style={styles.balloon}>
                        Oi! Aqui é o seu assistente virtual. No que posso te ajudar?
                    </Text>

                    <IconButton // dar funcionalidade a mensagem flutuante do chatbot
                        icon={MessageCircle}
                        size={29}
                        color="#FFFFFF"
                        accessibilityLabel="Abrir assistente virtual"
                        onPress={() => onAssistentePress?.()}
                        style={styles.assistantButton}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}> 
                {abas.map(({ titulo, Icone, ativa, onPress }) => {
                    const cor = ativa ? '#C8DFB9' : '#FFFFFF';  // adicionar navegação entre os icones do rodape

                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa, disabled: !ativa && !onPress }}
                            disabled={!ativa && !onPress}
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