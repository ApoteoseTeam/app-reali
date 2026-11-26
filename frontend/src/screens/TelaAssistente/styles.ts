
import { Platform, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    header: {
        minHeight: 60,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: colors.azulGestao,
    },

    headerButton: {
        width: 40,
        height: 44,
        backgroundColor: 'transparent',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        flex: 1,
        paddingHorizontal: 4,
        paddingVertical: 16,
        color: colors.white,
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'left',
    },

    headerActions: {
        flexDirection: 'row',
    },

    hidden: {
        display: 'none',
    },

    loading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    status: {
        color: colors.primary,
        fontSize: 14,
    },

    conversationItem: {
        backgroundColor: colors.surfaceLight,
        borderColor: colors.surface,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        gap: 5,
    },

    conversationTitle: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 16,
    },

    conversation: {
        flex: 1,
    },

    conversationContent: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
        gap: 12,
    },

    suggestions: {
        alignItems: 'flex-start',
        gap: 8,
        paddingTop: 2,
    },

    suggestionButton: {
        alignSelf: 'flex-start',
        width: 'auto',
        backgroundColor: colors.surfaceLight,
        borderColor: colors.secondary,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },

    suggestionText: {
        color: '#111111',
        fontSize: 12,
        fontWeight: '400',
    },

    composer: {
        borderTopWidth: 1,
        borderTopColor: '#D8DED8',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: Platform.select({
            ios: 12,
            android: 8,
            default: 8,
        }),
        backgroundColor: '#FFFFFF',
    },

    composerRow: {
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    messageInput: {
        flex: 1,
        minHeight: 46,
        borderWidth: 1,
        borderColor: colors.secondary,
        borderRadius: 999,
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
    },

    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.azulGestao,
        alignItems: 'center',
        justifyContent: 'center',
    },

    privacyHint: {
        marginTop: 5,
        textAlign: 'center',
        color: '#64736A',
        fontSize: 10,
    },
});
