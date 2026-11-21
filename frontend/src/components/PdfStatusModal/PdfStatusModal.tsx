import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { Check, CircleAlert } from 'lucide-react-native';
import { styles } from './styles';
import { Button } from '../Button/Button';

export type ArquivoPdf = {
    nome: string;
    abrir: () => Promise<void>;
};

export type EstadoPdf =
    | { tipo: 'gerando'; periodo: string; progresso: number | null }
    | { tipo: 'erro'; mensagem?: string }
    | { tipo: 'pronto'; arquivo: ArquivoPdf; erroAoAbrir?: string };

type Props = {
    estado: EstadoPdf | null;
    onFechar: () => void;
    onTentarNovamente: () => void;
    onAbrirPdf: () => void;
};

const azul = '#102B53';

export function PdfStatusModal({estado, onFechar, onTentarNovamente, onAbrirPdf}: Props) {
    if (!estado) return null;

    const gerando = estado.tipo === 'gerando';
    const erro = estado.tipo === 'erro';

    const titulo = gerando
        ? 'Gerando PDF...'
        : erro
            ? 'Não foi possível gerar o PDF'
            : 'PDF pronto';

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={onFechar}
        >
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
                        <>
                            <Text style={styles.descricao}>
                                Relatório de {estado.periodo}
                            </Text>

                            {estado.progresso !== null && (
                                <View
                                    style={styles.trilho}
                                    accessible
                                    accessibilityRole="progressbar"
                                    accessibilityLabel="Geração do PDF"
                                    accessibilityValue={{ min: 0, max: 100, now: estado.progresso }}
                                >
                                    <View
                                        style={[styles.barra, { width: `${estado.progresso}%` }]}
                                    />
                                </View>
                            )}
                        </>
                    )}

                    {estado.tipo === 'erro' && (
                        <Text style={styles.descricao}>
                            {estado.mensagem ?? 'Tente novamente. Seus dados continuam no relatório.'}
                        </Text>
                    )}

                    {estado.tipo === 'pronto' && (
                        <>
                            <Text style={styles.arquivo}>{estado.arquivo.nome}</Text>

                            {estado.erroAoAbrir && (
                                <Text accessibilityRole="alert" style={styles.descricao}>
                                    {estado.erroAoAbrir}
                                </Text>
                            )}
                        </>
                    )}

                    <View style={styles.acoes}>
                        {!gerando && (
                            <Button
                                label={erro ? 'Tentar novamente' : 'Abrir PDF'}
                                accessibilityRole="button"
                                onPress={erro ? onTentarNovamente : onAbrirPdf}
                                style={[styles.botao, styles.botaoPrincipal]}
                                textStyle={styles.textoBranco}
                            />
                        )}

                        <Button
                            label={estado.tipo === 'pronto' ? 'Fechar' : 'Cancelar'}
                            accessibilityRole="button"
                            onPress={onFechar}
                            style={[styles.botao, !gerando && styles.botaoContorno]}
                            textStyle={styles.textoAzul}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
