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
        <View style={styles.fundo}>
            <View style={styles.cartao} accessibilityViewIsModal>
                {gerando ? (
                    <ActivityIndicator color={azul} size="large" />
                ) : (
                    <View style={[styles.icone, erro && styles.iconeErro]}>
                        {erro ? (
                            <CircleAlert color="#B92D23" size={24} />
                        ) : (
                            <Check color="#2F5D50" size={24} />
                        )}
                    </View>
                )}

                <Text accessibilityRole="header" style={styles.titulo}>
                    {titulo}
                </Text>

                {estado.tipo === 'gerando' && (
                    <Text style={styles.descricao}>Relatório de {estado.periodo}</Text>
                )}

                {estado.tipo === 'erro' && (
                    <Text style={styles.descricao}>
                        Tente novamente. Seus dados continuam no relatório.
                    </Text>
                )}

                {estado.tipo === 'pronto' && (
                    <>
                        <Text style={styles.arquivo}>{estado.arquivo.nome}</Text>

                        {canal && (
                            <Text style={styles.descricao}>
                                {compartilharDireto
                                    ? `Escolha ${canal} na lista de aplicativos.`
                                    : `Baixe o PDF e anexe o arquivo em ${canal}.`}
                            </Text>
                        )}
                        {estado.erroAcao && (
                            <Text accessibilityRole="alert" style={styles.descricao}>
                                {estado.erroAcao}
                            </Text>
                        )}
                        {estado.avisoAcao && (
                            <Text accessibilityLiveRegion="polite" style={styles.descricao}>{estado.avisoAcao}</Text>
                        )}
                    </>
                )}

                <View style={styles.acoes}>
                    {!gerando && (
                        <Button
                            label={erro ? 'Tentar novamente' : compartilharDireto ? 'Compartilhar PDF' : 'Baixar PDF'}
                            accessibilityRole="button"
                            disabled={ocupado}
                            onPress={erro ? onTentarNovamente : compartilharDireto ? onCompartilhar : onBaixarPdf}
                            style={[styles.botao, styles.botaoPrincipal]}
                            textStyle={styles.textoBranco}
                        />
                    )}

                    {canal && !compartilharDireto && (
                        <Button
                            label={`Abrir ${canal}`}
                            accessibilityRole="button"
                            disabled={ocupado}
                            onPress={onAbrirCanal}
                            style={[styles.botao, styles.botaoContorno]}
                            textStyle={styles.textoAzul}
                        />
                    )}
                    <Button
                        label={estado.tipo === 'pronto' ? 'Fechar' : 'Cancelar'}
                        accessibilityRole="button"
                        onPress={onFechar}
                        disabled={ocupado}
                        style={[styles.botao, !gerando && styles.botaoContorno]}
                        textStyle={styles.textoAzul}
                    />
                </View>
            </View>
        </View>
    );
}
