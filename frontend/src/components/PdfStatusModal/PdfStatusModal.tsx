import { ActivityIndicator, Text, View } from 'react-native';
import { Check, CircleAlert } from 'lucide-react-native';
import { styles } from './styles';
import { Button } from '../Button/Button';
import type { ArquivoPdf, CanalRelatorio } from '../../services/reportPdf';

export type EstadoPdf =
    | { tipo: 'gerando'; periodo: string }
    | { tipo: 'erro'; canal?: CanalRelatorio }
    | { tipo: 'pronto'; arquivo: ArquivoPdf; canal?: CanalRelatorio; erroAcao?: string; avisoAcao?: string; semAnexo?: boolean };

type Props = {
    estado: EstadoPdf | null;
    onFechar: () => void;
    onTentarNovamente: () => void;
    onBaixarPdf: () => void;
    onCompartilhar: () => void;
    onAbrirCanal: () => void;
    ocupado: boolean;
};

const azul = '#102B53';

export function PdfStatusModal({
    estado, ocupado, onFechar, onTentarNovamente, onBaixarPdf, onCompartilhar, onAbrirCanal,
}: Props) {
    if (!estado) return null;

    const gerando = estado.tipo === 'gerando';
    const erro = estado.tipo === 'erro';

    const titulo = gerando
        ? 'Gerando PDF...'
        : erro
            ? 'Não foi possível gerar o PDF'
            : 'PDF pronto';
    const canal = estado.tipo === 'pronto' ? estado.canal : undefined;
    const compartilharDireto = estado.tipo === 'pronto' && canal
        && estado.arquivo.compartilhar && !estado.semAnexo;

    return (
        <View style={styles.background}>
            <View style={styles.card} accessibilityViewIsModal>
                {gerando ? (
                    <ActivityIndicator color={azul} size="large" />
                ) : (
                    <View style={[styles.icon, erro && styles.errorIcon]}>
                        {erro ? (
                            <CircleAlert color="#B92D23" size={24} />
                        ) : (
                            <Check color="#2F5D50" size={24} />
                        )}
                    </View>
                )}

                <Text accessibilityRole="header" style={styles.title}>
                    {titulo}
                </Text>

                {estado.tipo === 'gerando' && (
                    <Text style={styles.description}>Relatório de {estado.periodo}</Text>
                )}

                {estado.tipo === 'erro' && (
                    <Text style={styles.description}>
                        Tente novamente. Seus dados continuam no relatório.
                    </Text>
                )}

                {estado.tipo === 'pronto' && (
                    <>
                        <Text style={styles.archive}>{estado.arquivo.nome}</Text>

                        {canal && (
                            <Text style={styles.description}>
                                {compartilharDireto
                                    ? `Escolha ${canal} na lista de aplicativos.`
                                    : `Baixe o PDF e anexe o arquivo em ${canal}.`}
                            </Text>
                        )}
                        {estado.erroAcao && (
                            <Text accessibilityRole="alert" style={styles.description}>
                                {estado.erroAcao}
                            </Text>
                        )}
                        {estado.avisoAcao && (
                            <Text accessibilityLiveRegion="polite" style={styles.description}>{estado.avisoAcao}</Text>
                        )}
                    </>
                )}

                <View style={styles.actions}>
                    {!gerando && (
                        <Button
                            label={erro ? 'Tentar novamente' : compartilharDireto ? 'Compartilhar PDF' : 'Baixar PDF'}
                            accessibilityRole="button"
                            disabled={ocupado}
                            onPress={erro ? onTentarNovamente : compartilharDireto ? onCompartilhar : onBaixarPdf}
                            style={[styles.button, styles.mainButton]}
                            textStyle={styles.whiteText}
                        />
                    )}

                    {canal && !compartilharDireto && (
                        <Button
                            label={`Abrir ${canal}`}
                            accessibilityRole="button"
                            disabled={ocupado}
                            onPress={onAbrirCanal}
                            style={[styles.button, styles.outlineButton]}
                            textStyle={styles.blueText}
                        />
                    )}
                    <Button
                        label={estado.tipo === 'pronto' ? 'Fechar' : 'Cancelar'}
                        accessibilityRole="button"
                        onPress={onFechar}
                        disabled={ocupado}
                        style={[styles.button, !gerando && styles.outlineButton]}
                        textStyle={styles.blueText}
                    />
                </View>
            </View>
        </View>
    );
}
