import { Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, History, House, MessageCircle, TrendingUp, UserRound} from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { IconButton } from '../../components/IconButton/IconButton';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { Logo } from '../../components/Logo/Logo';
import { styles } from './styles';

type HomeProps = {
    onPerfilPress?: () => void;
    onAssistentePress?: () => void;
    onRelatoriosPress?: () => void;
    onCardapioPress?: () => void;
    onHistoricoPress?: () => void;
};

const RESUMO_DEMO = {
    nome: 'Horlando',
    escola: 'Escola Municipal Novo Horizonte',
    data: '09 de novembro de 2026',
    alunos: 400,
    refeicoesServidas: 300,
    refeicao: '09/11 · Almoço',
    cardapio: 'Arroz, feijão e omelete',
    consumo: '75% de consumo',
    aviso: 'Em dias de omelete, preparar 25% menos do que o habitual.',
};

export default function Home({
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

    return ( //adicionar logo apenas com o R
        <View style={styles.tela}>
            <View style={styles.cabecalho}>
                <Logo style={styles.logo} />  

                <IconButton //adicionar imagem real de uma pessoal
                    icon={UserRound}
                    size={19}
                    color="#FFFFFF"
                    accessibilityLabel="Abrir perfil"
                    onPress={() => onPerfilPress?.()}
                    style={styles.perfil}
                />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.conteudo}
            >
                <View style={styles.saudacao}>
                    <Text accessibilityRole="header" style={styles.titulo}>
                        Bom dia, {RESUMO_DEMO.nome}
                    </Text>
                    <Text style={styles.textoSecundario}>{RESUMO_DEMO.escola}</Text>
                </View>

                <View style={styles.indicador}>
                    <Text style={styles.data}>{RESUMO_DEMO.data}</Text>
                    <Kpicard
                        variant="gestao"
                        title="Alunos registrados"
                        value={RESUMO_DEMO.alunos}
                    />
                </View>

                <View style={styles.indicador}>
                    <Text style={styles.data}>{RESUMO_DEMO.data}</Text>
                    <Kpicard
                        variant="gestao"
                        title="Refeições servidas"
                        value={RESUMO_DEMO.refeicoesServidas}
                    />
                </View>

                <Card style={styles.refeicao}>
                    <Text style={styles.textoSecundario}>Refeição do dia</Text>
                    <Text style={styles.tituloRefeicao}>{RESUMO_DEMO.refeicao}</Text>
                    <Text style={styles.textoRefeicao}>
                        {RESUMO_DEMO.cardapio} · {RESUMO_DEMO.consumo}
                    </Text>
                </Card>

                <View style={styles.aviso}>
                    <Text style={styles.textoAviso}>
                        <Text style={styles.negrito}>Ponto de atenção: </Text>
                        {RESUMO_DEMO.aviso}
                    </Text>
                </View>

                <View style={styles.assistente}>
                    <Text style={styles.balao}>
                        Oi! Aqui é o seu assistente virtual. No que posso te ajudar?
                    </Text>

                    <IconButton // dar funcionalidade a mensagem flutuante do chatbot
                        icon={MessageCircle}
                        size={29}
                        color="#FFFFFF"
                        accessibilityLabel="Abrir assistente virtual"
                        onPress={() => onAssistentePress?.()}
                        style={styles.botaoAssistente}
                    />
                </View>
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