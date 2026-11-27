import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, History, Plus, Send } from 'lucide-react-native';

import type { ChatSource, Conversation } from '../../api/reali';
import { Button } from '../../components/Button/Button';
import { ChatMessage } from '../../components/ChatMessage/ChatMessage';
import { Header } from '../../components/Header/header';
import { IconButton } from '../../components/IconButton/IconButton';
import { Input } from '../../components/Input/Input';
import { useRealInova } from '../../hooks/useRealInova';
import { dateLabel } from '../../services/dates';
import { api, useSession } from '../../session/provider';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const perguntasRapidas = [
    'Quantos alunos entraram hoje?',
    'Quantos pratos foram servidos ontem?',
    'Quantos pratos foram previstos hoje?',
];

const fontes: Record<string, string> = {
    STUDENT_COUNTS: 'Contagem de entradas',
    PLATE_COUNTS: 'Pratos servidos',
    MEAL_FORECASTS: 'Previsão de refeições',
    DAILY_METRICS: 'Indicadores diários',
    MEAL_SERVICE_METRICS: 'Serviços de refeição',
    PERIOD_COMPARISON: 'Comparação entre períodos',
    SCHOOL_PERFORMANCE: 'Indicadores da escola',
    SCHOOL_COMPARISON: 'Comparação entre escolas',
};

function sourceLabel({ ref, type, period }: ChatSource) {
    const label = fontes[type] ?? 'Indicadores do Reali';
    const start = dateLabel(period.start_date);
    const end = dateLabel(period.end_date);
    const previous = period.previous;
    const comparison = previous ? ` · comparação com ${dateLabel(previous.start_date)} a ${dateLabel(previous.end_date)}` : '';
    return `[${ref}] ${label} · ${start === end ? start : `${start} a ${end}`}${comparison}`;
}

type Props = { onVoltar: () => void };
export default function TelaAssistente({ onVoltar }: Props) {
    const [showHistory, setShowHistory] = useState(false);
    const [conversation, setConversation] = useState<Conversation>();
    const [session, setSession] = useState(0);

    function openChat(next?: Conversation) {
        setConversation(next);
        setSession(current => current + 1);
        setShowHistory(false);
    }

    return (
        <View style={styles.screen}>
            <View style={showHistory ? styles.hidden : styles.screen}>
                <ChatSession key={session} conversation={conversation} onVoltar={onVoltar}
                    onHistory={() => setShowHistory(true)} onNewChat={() => openChat()} />
            </View>
            {showHistory && <ConversationHistory onBack={() => setShowHistory(false)}
                onNewChat={() => openChat()} onSelect={openChat} />}
        </View>
    );
}

function ChatSession({ conversation, onVoltar, onHistory, onNewChat }: Props & {
    conversation?: Conversation; onHistory: () => void; onNewChat: () => void;
}) {
    const { workspace } = useSession();
    const chat = useRealInova(workspace?.scope, workspace?.school?.id, conversation);
    const [draft, setDraft] = useState('');
    const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const canSend = chat.canSend && Boolean(chat.retry || draft.trim());
    const archived = conversation?.status === 'ARCHIVED';

    async function send(message: string) {
        if (!chat.canSend) return;
        setDraft(message);
        if (await chat.send(message)) setDraft('');
    }

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Header name="RealInova" containerStyle={styles.header} titleStyle={styles.headerTitle}
                left={<HeaderAction icon={ArrowLeft} label="Voltar" onPress={onVoltar} />}
                right={<View style={styles.headerActions}>
                    <HeaderAction icon={History} label="Conversas anteriores" onPress={onHistory} disabled={chat.sending} />
                    <HeaderAction icon={Plus} label="Nova conversa" onPress={onNewChat} disabled={chat.sending} />
                </View>}
            />

            <ScrollView ref={scrollRef} style={styles.conversation} contentContainerStyle={styles.conversationContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {!conversation && !chat.messages.length && !chat.sending && !chat.retry && (
                    <>
                        <ChatMessage remetente="assistente"
                            mensagem="Olá! Sou o RealInova. Posso ajudar a consultar contagens de entradas, pratos servidos e previsões de refeições." />
                        <View style={styles.suggestions}>
                            {perguntasRapidas.map(pergunta => (
                                <Button key={pergunta} label={pergunta} onPress={() => void send(pergunta)}
                                    disabled={!chat.canSend} style={styles.suggestionButton} textStyle={styles.suggestionText} />
                            ))}
                        </View>
                    </>
                )}
                {chat.loading && <Loading label="Carregando conversa…" />}
                {!chat.loading && !chat.loadError && conversation && !chat.messages.length && (
                    <Text style={styles.status}>Esta conversa ainda não tem mensagens.</Text>
                )}
                {chat.messages.map(message => (
                    <ChatMessage key={message.id}
                        remetente={message.role === 'USER' ? 'usuario' : 'assistente'}
                        mensagem={message.content || (message.status === 'PENDING'
                            ? chat.waiting ? 'Consultando os dados…' : 'A execução ficou pendente. Você pode enviar a pergunta novamente.'
                            : 'O RealInova não conseguiu responder a esta pergunta.')}
                        fontes={message.sources.map(source => ({ id: source.ref, label: sourceLabel(source) }))}
                    />
                ))}
                {chat.sending && <Loading label="RealInova está respondendo…" />}
                {chat.loadError && <>
                    <Text accessibilityRole="alert" style={styles.status}>{chat.loadError}</Text>
                    <Button label="Atualizar conversa" onPress={() => void chat.reload()} />
                </>}
                {chat.sendError && <Text accessibilityRole="alert" style={styles.status}>{chat.sendError}</Text>}
                {archived && <Text style={styles.status}>Conversa arquivada. Abra uma nova conversa para continuar.</Text>}
                {!workspace && <Text style={styles.status}>O RealInova precisa de acesso a uma instituição.</Text>}
            </ScrollView>

            {!archived && workspace && (
                <View style={styles.composer}>
                    {chat.retry ? (
                        <View style={styles.composerRow}>
                            <Button label={chat.sending ? 'Verificando…' : 'Verificar envio'} disabled={!chat.canSend}
                                onPress={() => void send(chat.retry?.message ?? '')} />
                        </View>
                    ) : (
                        <View style={styles.composerRow}>
                            <Input value={chat.sending ? '' : draft} onChangeText={setDraft} editable={chat.canSend}
                                placeholder="Digite sua pergunta" placeholderTextColor="#64736A" maxLength={2000}
                                returnKeyType="send" onSubmitEditing={() => void send(draft)}
                                accessibilityLabel="Digite sua pergunta" style={styles.messageInput} />
                            <IconButton icon={Send} color={colors.white} size={21} accessibilityLabel="Enviar mensagem"
                                onPress={() => void send(draft)} disabled={!canSend} style={styles.sendButton} />
                        </View>
                    )}
                    <Text style={styles.privacyHint}>
                        {workspace.school?.name ?? workspace.organization.name} · Evite enviar nomes de alunos.
                    </Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

function HeaderAction({ icon, label, onPress, disabled }: {
    icon: typeof ArrowLeft; label: string; onPress: () => void; disabled?: boolean;
}) {
    return <IconButton icon={icon} color={colors.white} size={21} accessibilityLabel={label}
        onPress={onPress} disabled={disabled} style={styles.headerButton} />;
}

function Loading({ label }: { label: string }) {
    return <View style={styles.loading}>
        <ActivityIndicator color={colors.secondary} />
        <Text accessibilityLiveRegion="polite" style={styles.status}>{label}</Text>
    </View>;
}

function ConversationHistory({ onBack, onNewChat, onSelect }: {
    onBack: () => void; onNewChat: () => void; onSelect: (item: Conversation) => void;
}) {
    const { workspace } = useSession();
    const scope = workspace?.scope;
    const schoolId = workspace?.school?.id ?? null;
    const [conversations, setConversations] = useState<Conversation[]>();
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!scope) return;
        const controller = new AbortController();
        void api.conversations(scope, controller.signal).then(rows => {
            if (controller.signal.aborted) return;
            const currentSchool = rows.filter(item => item.school_id === schoolId);
            setConversations(currentSchool.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)));
        }).catch(error => {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Não foi possível carregar as conversas.');
        });
        return () => controller.abort();
    }, [scope, schoolId, attempt]);

    return (
        <View style={styles.screen}>
            <Header name="Conversas anteriores" containerStyle={styles.header} titleStyle={styles.headerTitle}
                left={<HeaderAction icon={ArrowLeft} label="Voltar ao chat" onPress={onBack} />}
                right={<HeaderAction icon={Plus} label="Nova conversa" onPress={onNewChat} />} />
            <ScrollView style={styles.conversation} contentContainerStyle={styles.conversationContent}>
                {!scope && <Text style={styles.status}>Vincule uma instituição para consultar suas conversas.</Text>}
                {scope && !conversations && !error && <Loading label="Carregando conversas…" />}
                {error && <>
                    <Text accessibilityRole="alert" style={styles.status}>{error}</Text>
                    <Button label="Tentar novamente" onPress={() => {
                        setError('');
                        setAttempt(current => current + 1);
                    }} />
                </>}
                {conversations?.length === 0 && <Text style={styles.status}>Nenhuma conversa salva neste contexto.</Text>}
                {conversations?.map(item => (
                    <Pressable key={item.id} style={styles.conversationItem} accessibilityRole="button" onPress={() => onSelect(item)}>
                        <Text style={styles.conversationTitle}>{item.title === 'Nova conversa' ? 'Conversa com RealInova' : item.title}</Text>
                        <Text style={styles.status}>
                            {new Date(item.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            {item.status === 'ARCHIVED' ? ' · Arquivada' : ''}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}
