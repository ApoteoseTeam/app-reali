import { Platform, StatusBar, StyleSheet } from 'react-native';

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
    paddingBottom: spacing.lg,
  },

  areaMedida: {
    width: '100%',
  },

  periodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#E4EFDA',
    borderRadius: 10,
  },

  periodoTexto: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },

  aviso: {
    color: colors.neutral,
    fontSize: typography.sizes.small,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  indicadores: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },

  indicadoresEmpilhados: {
    flexDirection: 'column',
  },

  indicador: {
    flex: 1,
    minWidth: 0,
  },

  comparacao: {
    color: '#52665C',
    fontSize: typography.sizes.small,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  secao: {
    marginTop: spacing.lg,
  },

  titulo: {
    color: colors.text,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
  },

  descricao: {
    color: '#52665C',
    fontSize: typography.sizes.small,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  grafico: {
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  assistente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  balao: {
    flexShrink: 1,
    maxWidth: 260,
    backgroundColor: '#E4EFDA',
    borderRadius: 16,
    padding: spacing.sm,
  },

  assistenteTitulo: {
    color: colors.text,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    lineHeight: 18,
  },

  assistenteTexto: {
    color: colors.text,
    fontSize: typography.sizes.small,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  assistenteIcone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EFDA',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
  },

  menuTexto: {
    color: colors.text,
    fontSize: 10,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },

  menuTextoAtivo: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});