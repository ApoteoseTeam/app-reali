import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import type React from 'react';

import { Header } from '../../components/Header/Header';
import { IconButton } from '../../components/IconButton/IconButton';
import { ChatMessage } from '../../components/ChatMessage/ChatMessage';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';

import { colors } from '../../theme/colors';
import { styles } from './styles';

type Message = {
    id: string;
    remetente: 'assistente' | 'usuario';
    mensagem: string;
    fonte?: string;
    observacao?: string;
};

type AssistenteVirtualProps = {
    onVoltar: () => void;
};

const perguntasRapidas = [
    'Ajustar previsão de alunos',
    'Sugerir cardápio com o estoque',
    'Como registrar a presença?',
];

const mensagemInicial: Message = {
    id: 'welcome',
    remetente: 'assistente',
    mensagem:
        'Olá! Sou seu assistente virtual. Posso ajudar com dúvidas sobre o sistema e os dados. Não substituo a nutricionista: as sugestões são hipóteses.',
};

export default function TelaAssistente({
    onVoltar,
}: AssistenteVirtualProps) {
    const [messages, setMessages] = useState<Message[]>([
        mensagemInicial,
    ]);

    const [draft, setDraft] = useState('');

    const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

    useEffect(() => {
        scrollRef.current?.scrollToEnd({
            animated: true,
        });
    }, [messages]);

    function enviarMensagem(texto = draft) {
        const mensagem = texto.trim();

        if (!mensagem) return;

        const novaMensagem: Message = {
            id: `${Date.now()}-user`,
            remetente: 'usuario',
            mensagem,
        };

        setMessages(current => [
            ...current,
            novaMensagem,
            {
                id: `${Date.now()}-response`,
                remetente: 'assistente',
                mensagem:
                    'Sua pergunta foi registrada nesta demonstração. A integração com a inteligência artificial será conectada posteriormente.',
                observacao: 'Resposta demonstrativa',
            },
        ]);

        setDraft('');
    }

    function selecionarPergunta(pergunta: string) {
        enviarMensagem(pergunta);
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={
                Platform.OS === 'ios'
                    ? 'padding'
                    : undefined
            }
        >
            <Header
                name="Assistente virtual"
                left={
                    <IconButton
                        icon={ArrowLeft}
                        color={colors.white}
                        size={22}
                        accessibilityLabel="Voltar"
                        onPress={onVoltar}
                        style={styles.backButton}
                    />
                }
                right={<View style={styles.headerRightSpace} />}
                containerStyle={styles.header}
                titleStyle={styles.headerTitle}
            />

            <ScrollView
                ref={scrollRef}
                style={styles.conversation}
                contentContainerStyle={styles.conversationContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() =>
                    scrollRef.current?.scrollToEnd({
                        animated: true,
                    })
                }
            >
                {messages.map(message => (
                    <ChatMessage
                        key={message.id}
                        remetente={message.remetente}
                        mensagem={message.mensagem}
                        fonte={message.fonte}
                        observacao={message.observacao}
                    />
                ))}

                <View style={styles.suggestions}>
                    {perguntasRapidas.map(pergunta => (
                        <Button
                            key={pergunta}
                            label={pergunta}
                            onPress={() =>
                                selecionarPergunta(pergunta)
                            }
                            style={styles.suggestionButton}
                            textStyle={styles.suggestionText}
                        />
                    ))}
                </View>
            </ScrollView>

            <View style={styles.composer}>
                <View style={styles.composerRow}>
                    <Input
                        value={draft}
                        onChangeText={setDraft}
                        placeholder="Digite sua pergunta"
                        placeholderTextColor="#64736A"
                        returnKeyType="send"
                        onSubmitEditing={() =>
                            enviarMensagem()
                        }
                        accessibilityLabel="Digite sua pergunta"
                        style={styles.messageInput}
                    />

                    <IconButton
                        icon={Send}
                        color={colors.white}
                        size={21}
                        accessibilityLabel="Enviar mensagem"
                        onPress={() => enviarMensagem()}
                        style={styles.sendButton}
                    />
                </View>

                <Text style={styles.privacyHint}>
                    Não envie nomes de alunos.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
