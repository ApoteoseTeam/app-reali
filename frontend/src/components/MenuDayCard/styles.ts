import { StyleSheet } from "react-native"
import { colors } from "../../theme/colors"
import { spacing } from "../../theme/spacing"

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },

  dia: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  destaque: {
    backgroundColor: colors.secondary,
    borderColor: '#102B53',
    borderWidth: 3,
  },
  preparacoes: {
    color: '#102B53',
    fontSize: 14,
    fontWeight: '600',
  },
  situacao: {
    color: '#102B53',
    fontSize: 12,
  },
  textoClaro: {
    color: '#FFFFFF',
  },
})