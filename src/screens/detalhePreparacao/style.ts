import {
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  cabecalho: {
    backgroundColor: colors.secondary,
    paddingTop:
      Platform.OS === 'android'
        ? StatusBar.currentHeight ?? 0
        : 0,
  },

  rolagem: {
    flex: 1,
  },

  conteudo: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  indicadores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  indicador: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
  },

  secao: {
    gap: spacing.sm,
  },

  titulo: {
    color: colors.primary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },

  grafico: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  hipoteses: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 12,
    gap: spacing.sm,
  },

  texto: {
    color: colors.text,
    fontSize: typography.sizes.body,
    lineHeight: 24,
  },

  nota: {
    color: '#52665C',
    fontSize: typography.sizes.small,
    lineHeight: 18,
  },

  botao: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  botaoTexto: {
    textAlign: 'center',
  },

  aviso: {
    color: '#52665C',
    fontSize: typography.sizes.small,
    lineHeight: 18,
    textAlign: 'center',
  },
});