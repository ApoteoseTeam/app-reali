import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';

import { ApiError, type Scope } from '../api/client';
import type { ChatRequest, Conversation, ConversationMessage } from '../api/reali';
import { api } from '../session/provider';

const pollInterval = 5000;
const executionLease = 180000;

function pending(message: ConversationMessage) {
    return message.status === 'PENDING' && Date.now() - Date.parse(message.created_at) < executionLease;
}

export function useRealInova(scope?: Scope, schoolId?: string, conversation?: Conversation) {
    const [conversationId, setConversationId] = useState(conversation?.id);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(Boolean(conversation));
    const [sending, setSending] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [sendError, setSendError] = useState('');
    const [retry, setRetry] = useState<ChatRequest>();
    const sendController = useRef<AbortController | null>(null);
    const readController = useRef<AbortController | null>(null);
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const reload = useCallback(async function readConversation() {
        if (!scope || !conversationId || readController.current || sendController.current) return;
        clearTimeout(refreshTimer.current);
        const controller = new AbortController();
        readController.current = controller;

        try {
            const saved = await api.conversationMessages(scope, conversationId, controller.signal);
            setMessages(saved);
            setLoadError('');
            if (saved.some(pending)) {
                refreshTimer.current = setTimeout(() => void readConversation(), pollInterval);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                if (error instanceof ApiError && [401, 403, 404].includes(error.status)) setMessages([]);
                setLoadError(error instanceof Error ? error.message : 'Não foi possível abrir a conversa.');
            }
        } finally {
            if (readController.current === controller) {
                readController.current = null;
                setLoading(false);
            }
        }
    }, [scope, conversationId]);

    const openedId = conversation?.id;
    useEffect(() => {
        if (openedId) void reload();
        return () => {
            clearTimeout(refreshTimer.current);
            readController.current?.abort();
            readController.current = null;
        };
    }, [openedId, reload]);

    useEffect(() => () => {
        sendController.current?.abort();
        sendController.current = null;
    }, []);

    const waiting = messages.some(pending);
    const canSend = Boolean(scope && !loading && !loadError && !sending && !waiting && conversation?.status !== 'ARCHIVED');

    async function send(text: string) {
        if (!scope || !canSend || sendController.current || readController.current) return;
        const message = text.trim();
        if (!retry && !message) return;

        const controller = new AbortController();
        const created_at = new Date().toISOString();
        sendController.current = controller;
        setSending(true);
        setSendError('');

        try {
            const body = retry ?? {
                message, conversation_id: conversationId, school_id: schoolId, client_request_id: randomUUID(),
            };
            const userId = body.client_request_id;
            setMessages(current => [
                ...current.filter(item => item.id !== userId),
                { id: userId, role: 'USER', content: body.message, status: 'COMPLETED', sources: [], created_at },
            ]);

            let result;
            let accepted = false;
            const deadline = Date.now() + executionLease + pollInterval;
            try {
                result = await api.chat(scope, body, controller.signal);
                while (result.status === 'PENDING') {
                    accepted = true;
                    if (Date.now() >= deadline) {
                        throw new ApiError(0, 'TIMEOUT', 'O RealInova ainda está processando a pergunta.');
                    }
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                    if (controller.signal.aborted) return;
                    result = await api.chat(scope, body, controller.signal);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                const uncertain = accepted || !(error instanceof ApiError) || error.status === 0
                    || error.code === 'INVALID_RESPONSE' || (error.status >= 500 && error.code !== 'AI_PROVIDER_UNAVAILABLE');
                setRetry(uncertain ? body : undefined);
                if (!uncertain) setMessages(current => current.filter(item => item.id !== userId));
                if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
                    setMessages([]);
                    setRetry(undefined);
                    if (conversationId) {
                        setLoadError(error.message);
                        return;
                    }
                }
                throw error;
            }

            setConversationId(result.conversation_id);
            setRetry(undefined);
            setMessages(current => [...current, {
                id: result.message_id, role: 'ASSISTANT', status: result.status, sources: result.sources, created_at,
                content: result.answer ?? result.error?.message ?? 'O RealInova não retornou uma resposta.',
            }]);
            return result.status === 'COMPLETED';
        } catch (error) {
            if (!controller.signal.aborted) setSendError(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
        } finally {
            if (sendController.current === controller) {
                sendController.current = null;
                setSending(false);
            }
        }
    }

    return { messages, loading, sending, waiting, loadError, sendError, retry, canSend, reload, send };
}
