import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Mail, MessageSquare, X } from 'lucide-react-native';

import { IconButton } from '../IconButton/IconButton';
import { styles } from './styles';

type Props = {
    visivel: boolean;
    periodo: string;
    onFechar: () => void;
    onWhatsApp?: () => void;
    onEmail?: () => void;
};

export function CompartilharRelatorioModal({
    visivel,
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
        <Modal
            visible={visivel}
            transparent
            animationType="slide"
            onRequestClose={onFechar}
        >
            <View style={styles.background}>
                <View style={styles.panel} accessibilityViewIsModal>
                    <View style={styles.header}>
                        <View style={styles.texts}>
                            <Text accessibilityRole="header" style={styles.title}>
                                Compartilhar relatório
                            </Text>
                            <Text style={styles.description}>Resumo de {periodo}</Text>
                        </View>

                        <IconButton
                            icon={X}
                            size={22}
                            color="#102B53"
                            accessibilityLabel="Fechar opções de compartilhamento"
                            onPress={onFechar}
                            style={styles.close}
                        />
                    </View>

                    <ScrollView contentContainerStyle={styles.options}>
                        {opcoes.map(({ titulo, descricao, Icone, acao }) => (
                            <Pressable
                                key={titulo}
                                accessibilityRole="button"
                                accessibilityLabel={`${titulo}. ${descricao}`}
                                accessibilityState={{ disabled: !acao }}
                                disabled={!acao}
                                onPress={acao}
                                style={[styles.option, !acao && styles.disabled]}
                            >
                                <View style={styles.icon}>
                                    <Icone size={21} color="#102B53" />
                                </View>

                                <View style={styles.texts}>
                                    <Text style={styles.optionName}>{titulo}</Text>
                                    <Text style={styles.description}>{descricao}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}