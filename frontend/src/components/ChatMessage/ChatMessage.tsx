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
                styles.balao,
                isUsuario ? styles.balaoUsuario : styles.balaoAssistente,
            ]}
        >
            <Text
                style={[styles.mensagem, isUsuario && styles.mensagemUsuario]}
                accessibilityLabel={`${nomeRemetente}: ${mensagem}`}
            >
                {mensagem}
            </Text>

            {fonte ? (
                <View style={styles.caixaFonte}>
                    <Text style={styles.textoFonte}>Fonte: {fonte}</Text>
                </View>
            ) : null}

            {observacao ? <Chip texto={observacao} /> : null}
        </View>
    );
}