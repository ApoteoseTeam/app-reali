import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const azulGestao = '#102B53';

export const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#FFFFFF' },

  cabecalho: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: azulGestao,
  },
  logo: { width: 34, height: 34, tintColor: '#FFFFFF' },
  perfil: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  conteudo: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    gap: 14,
  },
  saudacao: { gap: 3 },
  titulo: { color: azulGestao, fontSize: 24, fontWeight: '700' },
  textoSecundario: { color: '#4D6257', fontSize: 13 },
  indicador: { gap: 6 },
  data: { color: colors.secondary, fontSize: 14, fontWeight: '700' },

  refeicao: {
    padding: 14,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  tituloRefeicao: { color: azulGestao, fontSize: 15, fontWeight: '700' },
  textoRefeicao: { color: colors.text, fontSize: 13 },

  aviso: { padding: 14, borderRadius: 12, backgroundColor: '#FFF3D5' },
  textoAviso: { color: '#624900', fontSize: 13, lineHeight: 19 },
  negrito: { fontWeight: '700' },

  assistente: {
    marginTop: 'auto',
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  balao: {
    flexShrink: 1,
    maxWidth: 218,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E0F0CF',
    color: azulGestao,
    fontSize: 13,
    fontWeight: '700',
  },
  botaoAssistente: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: azulGestao,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rodape: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    backgroundColor: azulGestao,
  },
  aba: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  textoAba: { fontSize: 11, fontWeight: '600' },
});