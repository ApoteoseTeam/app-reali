import { Pressable, ScrollView, Text, View,Image } from 'react-native';
import { ClipboardList, History, House, MessageCircle, TrendingUp, UserRound} from 'lucide-react-native';

import { Card } from '../../components/Card/Card';
import { IconButton } from '../../components/IconButton/IconButton';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { styles } from './styles';

type HomeProps = {
    resumo?: Resumo;
    profilePhoto?: string;
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
    profilePhoto,
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
        <View style={styles.tela}>
            <View style={styles.cabecalho}>
                <Image
                    source={require('../../assets/r-logotipo-branca.png')}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel="Reali"
                />

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir perfil"
                    onPress={onPerfilPress}
                    style={styles.perfil}
                >
                    {profilePhoto ? (
                        <Image
                            source={{ uri: 'data:image/jpeg;base64,' + profilePhoto }}
                            style={styles.fotoPerfil}
                        />
                    ) : (
                        <UserRound size={19} color="#FFFFFF" />
                    )}
                </Pressable>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.conteudo}
            >
                <View style={styles.saudacao}>
                    <Text accessibilityRole="header" style={styles.titulo}>
                        Bom dia, {resumo?.nome}
                    </Text>
                    <Text style={styles.textoSecundario}>{resumo?.escola}</Text>
                </View>

                <View style={styles.indicador}>
                    <Text style={styles.data}>{resumo?.data}</Text>
                    <Kpicard
                        variant="gestao"
                        title="Alunos registrados"
                        value={resumo?.alunos ?? null}
                    />
                </View>

                <View style={styles.indicador}>
                    <Text style={styles.data}>{resumo?.data}</Text>
                    <Kpicard
                        variant="gestao"
                        title="Refeições servidas"
                        value={resumo?.refeicoesServidas ?? null}
                    />
                </View>

                <Card style={styles.refeicao}>
                    <Text style={styles.textoSecundario}>Refeição do dia</Text>
                    <Text style={styles.tituloRefeicao}>{resumo?.refeicao}</Text>
                    <Text style={styles.textoRefeicao}>
                        {resumo?.cardapio} · {resumo?.consumo}
                    </Text>
                </Card>

                <View style={styles.aviso}>
                    <Text style={styles.textoAviso}>
                        <Text style={styles.negrito}>Ponto de atenção: </Text>
                        {resumo?.aviso}
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
