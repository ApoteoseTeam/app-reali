import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.secondary,
  },
  optionText: {
    flex: 1,
    gap: spacing.xs,
  },
  optionLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    color: colors.secondary,
    fontSize: 13,
  },
  message: {
    color: colors.primary,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
  },
  confirm: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  secondary: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  secondaryText: {
    color: colors.primary,
  },
});
