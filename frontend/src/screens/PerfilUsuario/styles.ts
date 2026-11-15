import { StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme/colors';

const FONT = 'Arial';
const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },

  topo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 8,
  },
  perfilTopo: {
    position: 'relative',
  },
  fundoTopo: {
    position: 'absolute',
    top: 0,
    left: '-20%',
    right: '-20%',
    bottom: 75,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
    backgroundColor: colors.primary,
  },
  titulo: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  iconeTopo: {
    padding: 4,
  },

  avatarArea: {
    alignSelf: 'center',
    marginTop: 33,
  },
  avatarBorda: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 7,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  editar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nome: {
    fontFamily: SERIF,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 24,
  },
  cargo: {
    fontFamily: SERIF,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },

  conteudo: {
    paddingHorizontal: 50,
    marginTop: 50,
    gap: 17,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linhaTexto: {
    fontFamily: FONT,
    fontSize: 12,
    color: colors.text,
    flexShrink: 1,
  },
  botaoSair: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    borderRadius: 14,
    marginTop: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  botaoSairTexto: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  abas: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: colors.surfaceLight,
  },
  aba: {
    alignItems: 'center',
    gap: 2,
  },
  abaTexto: {
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
});