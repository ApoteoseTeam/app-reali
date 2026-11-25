import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azul = '#102B53';
const verdeClaro = '#E6F2DA';

export const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },

    panel: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#FFFFFF',
        padding: 20,
        gap: 14,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    texts: {
        flex: 1
    },

    title: {
        color: azul,
        fontSize: 20,
        fontWeight: '700'
    },

    description: {
        color: '#465950',
        fontSize: 13,
        lineHeight: 18
    },

    close: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: verdeClaro,
    },

    options: {
        gap: 12
    },

    option: {
        minHeight: 68,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: colors.surface,
        borderRadius: 14,
    },

    icon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: verdeClaro,
    },

    optionName: {
        color: azul,
        fontSize: 16,
        fontWeight: '700'
    },

    disabled: {
        opacity: 0.55
    },
});