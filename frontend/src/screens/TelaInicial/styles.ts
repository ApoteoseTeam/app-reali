import { StyleSheet } from "react-native"

import { typography } from '../../theme/typography'
import { colors } from '../../theme/colors'
import { spacing } from '../../theme/spacing'

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        position: 'relative',
    },
    topBlob: {
        position: 'absolute',
        top: -80,
        left: -80,
        width: 300,
        height: 200,
    },
    bottomWave: {
        position: 'absolute',
        bottom: -160,
        left: '-20%',
        right: 0,
        height: 300,
        width: '130',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        zIndex: 1,
    },
    headerGroup: {
        alignItems: 'center',
    },
    title: {
        fontSize: 56,
        color: colors.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.sizes.small,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 20,
        textAlign: 'center',
    },
    description: {
        fontSize: typography.sizes.small,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        maxWidth: 310,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    buttonTwo: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTwoText: {
        color: colors.primary,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    footerTextGroup: {
        flex: 1,
        paddingRight: 12,
    },
    footerText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
        marginLeft: 20,
        marginBottom: 12
    },
    foodImage: {
        width: 160,
        height: 160,
        bottom: -10
    }
});