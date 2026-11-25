import { Text, View } from 'react-native';

import { Chip } from '../Chip/Chip';
import { styles } from './styles';

type ChatMessageProps = {
    remetente: 'assistente' | 'usuario';
    mensagem: string;
    fonte?: string;
    observacao?: string;
};

export function ChatMessage({
    remetente,
    mensagem,
    fonte,
    observacao,
}: ChatMessageProps) {
    const isUsuario = remetente === 'usuario';
    const nomeRemetente = isUsuario ? 'Você' : 'Assistente virtual';

    return (
        <View
            style={[
                styles.balloon,
                isUsuario ? styles.userBubble : styles.assistantBubble,
            ]}
        >
            <Text
                style={[styles.message, isUsuario && styles.userMessage]}
                accessibilityLabel={`${nomeRemetente}: ${mensagem}`}
            >
                {mensagem}
            </Text>

            {fonte ? (
                <View style={styles.sourceBox}>
                    <Text style={styles.sourceText}>Fonte: {fonte}</Text>
                </View>
            ) : null}

            {observacao ? <Chip texto={observacao} /> : null}
        </View>
    );
}