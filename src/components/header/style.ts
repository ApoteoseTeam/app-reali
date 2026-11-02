import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const style = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
    backgroundColor: colors.secondary,
  },

  container_name: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pagename: {
    color: colors.textSecondary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    padding: 20,
  },

  icon: {
    position: 'absolute',
    right: 24,
    height: 48,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backContainer: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
    gap: 8,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
});