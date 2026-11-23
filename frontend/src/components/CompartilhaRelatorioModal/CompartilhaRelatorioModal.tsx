import { Pressable, ScrollView, Text, View } from 'react-native';
import { Mail, MessageSquare, X } from 'lucide-react-native';

import { IconButton } from '../IconButton/IconButton';
import { styles } from './styles';

type Props = {
    periodo: string;
    onFechar: () => void;
    onWhatsApp?: () => void;
    onEmail?: () => void;
};

export function CompartilharRelatorioModal({
    periodo,
    onFechar,
    onWhatsApp,
    onEmail,
}: Props) {
    const opcoes = [
        {
            titulo: 'WhatsApp',
            descricao: 'Enviar para um contato ou grupo',
            Icone: MessageSquare,
            acao: onWhatsApp,
        },
        {
            titulo: 'E-mail',
            descricao: 'Enviar o resumo em PDF',
            Icone: Mail,
            acao: onEmail,
        },
    ];

    return (
        <View style={styles.fundo}>
            <View style={styles.painel} accessibilityViewIsModal>
                <View style={styles.cabecalho}>
                    <View style={styles.textos}>
                        <Text accessibilityRole="header" style={styles.titulo}>
                            Compartilhar relatório
                        </Text>
                        <Text style={styles.descricao}>Resumo de {periodo}</Text>
                    </View>

                    <IconButton
                        icon={X}
                        size={22}
                        color="#102B53"
                        accessibilityLabel="Fechar opções de compartilhamento"
                        onPress={onFechar}
                        style={styles.fechar}
                    />
                </View>

                <ScrollView contentContainerStyle={styles.opcoes}>
                    {opcoes.map(({ titulo, descricao, Icone, acao }) => (
                        <Pressable
                            key={titulo}
                            accessibilityRole="button"
                            accessibilityLabel={`${titulo}. ${descricao}`}
                            accessibilityState={{ disabled: !acao }}
                            disabled={!acao}
                            onPress={acao}
                            style={[styles.opcao, !acao && styles.desabilitada]}
                        >
                            <View style={styles.icone}>
                                <Icone size={21} color="#102B53" />
                            </View>

                            <View style={styles.textos}>
                                <Text style={styles.nomeOpcao}>{titulo}</Text>
                                <Text style={styles.descricao}>{descricao}</Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}