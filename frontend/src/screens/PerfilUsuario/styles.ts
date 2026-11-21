import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const FONT = 'Arial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  
  perfilTopo: {
    position: 'relative',
  },

  fundoTopo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 62,
    backgroundColor: colors.primary,
  },

  topo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 12,
  },

  titulo: {
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },

  iconeTopo: {
    padding: 4,
  },

  iconeEspacador: {
    width: 32,
  },

  avatarArea: {
    alignSelf: 'center',
    marginTop: 12,
  },

  avatarBorda: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },

  avatar: {
    width: '100%',
    height: '100%',
  },

  editar: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nome: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 14,
  },

  cargo: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },

  conteudo: {
    paddingHorizontal: 38,
    marginTop: 26,
    gap: 20,
  },

  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  
  cardConta: {
    paddingBottom: 28,
  },

  cardTitulo: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  linhaTexto: {
    fontFamily: FONT,
    fontSize: 12.5,
    color: colors.primary,
    flexShrink: 1,
  },

  botaoSair: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    borderRadius: 10,
    marginTop: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoSairTexto: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});