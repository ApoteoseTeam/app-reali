import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },

  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.azulGestao,
  },

  logo: {
    width: 53,
    height: 53,
  },

  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    flex: 1
  },

  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    gap: 14,
  },

  greeting: {
    gap: 3
  },

  title: {
    color: colors.azulGestao,
    fontSize: 24,
    fontWeight: '700'
  },

  secundaryText: {
    color: '#4D6257',
    fontSize: 13
  },

  indicator: {
    gap: 6
  },

  date: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '700'
  },

  snack: {
    padding: 14,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 12,
    backgroundColor: colors.background,
  },

  titleSnack: {
    color: colors.azulGestao,
    fontSize: 15,
    fontWeight: '700'
  },

  textSnack: {
    color: colors.text,
    fontSize: 13
  },

  alert: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFF3D5'
  },

  textAlert: {
    color: '#624900',
    fontSize: 13,
    lineHeight: 19
  },

  bold: {
    fontWeight: '700'
  },

  assistent: {
    marginTop: 'auto',
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },

  balloon: {
    flexShrink: 1,
    maxWidth: 218,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E0F0CF',
    color: colors.azulGestao,
    fontSize: 13,
    fontWeight: '700',
  },

  assistantButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.azulGestao,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    backgroundColor: colors.azulGestao,
  },

  tab: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  textTab: {
    fontSize: 11,
    fontWeight: '600'
  },
});