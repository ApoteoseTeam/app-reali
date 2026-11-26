import { Text, View } from 'react-native';

import { styles } from './styles';

type ChatMessageProps = {
    remetente: 'assistente' | 'usuario';
    mensagem: string;
    fontes?: { id: number; label: string }[];
};

export function ChatMessage({
    remetente,
    mensagem,
    fontes,
}: ChatMessageProps) {
    const isUsuario = remetente === 'usuario';
    const nomeRemetente = isUsuario ? 'Você' : 'RealInova';

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

            {!!fontes?.length && (
                <View style={styles.sourceBox}>
                    <Text style={styles.sourceText}>Fontes</Text>
                    {fontes.map(fonte => <Text key={fonte.id} style={styles.sourceText}>{fonte.label}</Text>)}
                </View>
            )}
        </View>
    );
}
