import { useEffect, useState, useRef } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { ClipboardList, History, House, TrendingUp } from 'lucide-react-native';

import { BarList } from '../../components/BarList/BarList';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Header } from '../../components/header/header';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { Select } from '../../components/select/Select';
import { Logo } from '../../components/Logo/Logo';
import { Input } from '../../components/Input/Input';
import { CompartilharRelatorioModal } from '../../components/CompartilhaRelatorioModal/CompartilhaRelatorioModal';
import { PdfStatusModal, type ArquivoPdf, type EstadoPdf } from '../../components/PdfStatusModal/PdfStatusModal';
import { StatusModal } from '../../components/StatusModal/StatusModal';

import { mealTypes } from '../../api/reali';
import { api, useSession } from '../../session/provider';
import { useRemote } from '../../hooks/useRemote';
import { dateLabel, localDate, monthRange } from '../../services/dates';
import { styles } from './styles';

type DadosRelatorio = {
    month: string;
    periodo: string;
    alunos: number;
    previsao: number;
};

type FormularioResumoProps = {
    onInicioPress?: () => void;
    onRelatoriosPress?: () => void;
    onCardapioPress?: () => void;
    onHistoricoPress?: () => void;
    initialMode?: 'Mensal' | 'Diário';
    onBaixarPdf?: (
        relatorio: DadosRelatorio,
        opcoes: {
            signal: AbortSignal;
            onProgresso: (percentual: number) => void;
        }
    ) => Promise<ArquivoPdf>;
};

export default function Relatorio({ onBaixarPdf, onInicioPress, onRelatoriosPress, onCardapioPress, onHistoricoPress, initialMode = "Mensal" }: FormularioResumoProps = {}) {
    const abas = [
        { titulo: 'Início', Icone: House, onPress: onInicioPress },
        { titulo: 'Relatórios', Icone: TrendingUp, ativa: initialMode === 'Mensal', onPress: onRelatoriosPress },
        { titulo: 'Cardápio', Icone: ClipboardList, onPress: onCardapioPress },
        { titulo: 'Histórico', Icone: History, ativa: initialMode === 'Diário', onPress: onHistoricoPress },
    ];
    const [modo, setModo] = useState<string>(initialMode);
    const { workspace } = useSession();
    const [selectedMonth, setMes] = useState('');
    const [selectedMeal, setDiaRefeicao] = useState('');
    const school = workspace?.school;
    const scope = workspace?.scope;
    const today = localDate();
    const months = Array.from({ length: 12 }, (_, offset) => {
        const date = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - offset, 1, 12));
        const key = date.toISOString().slice(0, 7);
        return { key, label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
    });
    const month = months.find(item => item.label === selectedMonth) ?? months[0];
    const query = { school: school?.id, ...monthRange(month.key) };
    const report = useRemote('report/' + month.key, signal => api.summary(scope!, query, signal), Boolean(scope && school && modo === 'Mensal'));
    const meals = useRemote('meal-metrics/' + month.key, signal =>
        api.all(() => api.mealMetrics(scope!, query, signal), { scope, signal }),
        Boolean(scope && school && modo === 'Diário'));
    const mealOptions = (meals.data ?? []).map(item => ({
        item, label: dateLabel(item.reference_date) + ' · ' + mealTypes[item.meal_type],
    }));
    const meal = mealOptions.find(option => option.label === selectedMeal) ?? mealOptions[0];
    const diaRefeicao = meal?.label ?? '';
    const [compartilharAberto, setCompartilharAberto] = useState(false);
    const [estadoPdf, setEstadoPdf] = useState<EstadoPdf | null>(null);
    const exportacao = useRef<AbortController | null>(null);
    const mensal = modo === 'Mensal';
    const metrics = report.data?.summary;
    const relatorio = {
        month: month.key,
        periodo: month.label,
        alunos: metrics?.total_student_entries ?? 0,
        previsao: metrics?.total_forecast_plates ?? 0,
    };
    const served = metrics?.total_served_plates ?? 0;
    const previous = report.data?.previous.total_forecast_plates;
    const difference = report.data?.comparison.total_forecast_plates;
    const variacao = previous && difference != null ? difference / previous * 100 : null;
    const percentual = Math.abs(variacao ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const simbolo = (variacao ?? 0) > 0 ? '▲' : '▼';
    const textoComparacao = `a previsão de atendimento ${(variacao ?? 0) > 0 ? 'aumentou' : 'caiu'} ${percentual}%.`;
    const totalPlanejado = meal?.item.total_forecast_plates;
    const podeSalvar = false;

    useEffect(() => () => exportacao.current?.abort(), []);

    async function baixarPdf() {
        if (!onBaixarPdf || exportacao.current) return;

        const controle = new AbortController();
        const periodo = relatorio.periodo.toLocaleLowerCase('pt-BR');

        exportacao.current = controle;
        setEstadoPdf({ tipo: 'gerando', periodo, progresso: null });

        try {
            const arquivo = await onBaixarPdf(relatorio, {
                signal: controle.signal,
                onProgresso: (percentual) => {
                    if (controle.signal.aborted || exportacao.current !== controle) return;
                    if (!Number.isFinite(percentual)) return;

                    const progresso = Math.min(100, Math.max(0, Math.round(percentual)));
                    setEstadoPdf({ tipo: 'gerando', periodo, progresso });
                },
            });

            if (!controle.signal.aborted && exportacao.current === controle) {
                setEstadoPdf({ tipo: 'pronto', arquivo });
            }
        } catch {
            if (!controle.signal.aborted && exportacao.current === controle) {
                setEstadoPdf({ tipo: 'erro' });
            }
        } finally {
            if (exportacao.current === controle) {
                exportacao.current = null;
            }
        }
    }

    function fecharPdf() {
        const controle = exportacao.current;
        exportacao.current = null;
        controle?.abort();
        setEstadoPdf(null);
    }

    async function abrirPdf() {
        if (estadoPdf?.tipo !== 'pronto') return;

        const { arquivo } = estadoPdf;

        try {
            await arquivo.abrir();
        } catch {
            setEstadoPdf((atual) =>
                atual?.tipo === 'pronto' && atual.arquivo === arquivo
                    ? { ...atual, erroAoAbrir: 'Não foi possível abrir o PDF.' }
                    : atual
            );
        }
    }

    return (
        <View style={styles.tela}>
            <Header
                name="Relatório"
                right={null}
                containerStyle={styles.cabecalho}
                titleStyle={styles.tituloCabecalho}
            />

            <ScrollView contentContainerStyle={styles.conteudo}>
                <SegmentedControl
                    opcoes={['Mensal', 'Diário']}
                    selecionado={modo}
                    aoSelecionar={setModo}
                />

                {mensal ? (
                    <>
                        <Select
                            variant='relatorio'
                            label={mensal ? 'Mês do relatório' : 'Dia do relatório'}
                            options={months.map(item => item.label)}
                            value={month.label}
                            onChange={setMes}
                        />

                        <Card style={styles.relatorio}>
                            <Logo style={styles.marca} />

                            <Text accessibilityRole="header" style={styles.tituloRelatorio}>
                                Resumo do atendimento escolar
                            </Text>

                            <Text style={styles.info}>
                                {school?.name ?? '—'} · {relatorio.periodo}
                            </Text>

                            <View style={styles.indicadores}>
                                <View style={styles.indicador}>
                                    <Kpicard title="Total de alunos registrados" value={metrics?.total_student_entries ?? null} />
                                </View>

                                <View style={styles.indicador}>
                                    <Kpicard title="Refeições servidas" value={metrics?.total_served_plates ?? null} />
                                </View>
                            </View>

                            <Text accessibilityRole="header" style={styles.subtitulo}>
                                Quantidade de alunos
                            </Text>

                            <BarList
                                itens={[
                                    ...(metrics?.total_student_entries == null ? [] : [{ nome: 'Alunos', valor: relatorio.alunos }]),
                                    ...(metrics?.total_served_plates == null ? [] : [{ nome: 'Pratos', valor: served }]),
                                ]}
                                unidade=""
                            />
                            {Boolean(variacao) && (
                                <Text style={styles.comparacao}>
                                    {simbolo} Em relação ao período anterior: {textoComparacao}
                                </Text>
                            )}

                            <Text accessibilityRole="header" style={styles.subtitulo}>
                                Pontos de Atenção
                            </Text>

                            <Text style={styles.info}>
                                {metrics?.forecast_difference == null ? 'Diferença de previsão indisponível.' : `Diferença de previsão: ${metrics.forecast_difference}`}
                            </Text>

                            <Text style={styles.info}>
                                {report.error?.message ?? (report.loading ? 'Carregando dados' : metrics?.calculated_at ? `Atualizado em ${new Date(metrics.calculated_at).toLocaleString('pt-BR')}` : 'Sem dados disponíveis')}
                            </Text>
                        </Card>
                    </>

                ) : (
                    <View style={styles.diario}>
                        <Text style={styles.rotuloDiario}>Data e refeição</Text>

                        <Select
                            variant="relatorio"
                            label="Data e refeição"
                            options={mealOptions.map(option => option.label)}
                            value={diaRefeicao}
                            onChange={setDiaRefeicao}
                        />

                        <Text style={styles.rotuloDiario}>Total de alunos registrados</Text>

                        <Input
                            accessibilityLabel="Total de alunos registrados"
                            inputMode="numeric"
                            placeholder="Informe o total"
                            placeholderTextColor="#E6F2DA"
                            value={meal?.item.snapshot_entries?.toString() ?? ''}
                            editable={false}
                            style={styles.inputDiario}
                        />

                        <Text style={styles.ajudaDiario}>
                            {meals.error?.message ?? 'Total registrado pelo Django.'}
                        </Text>

                        <Card style={styles.cardMargem}>
                            <Text style={styles.tituloMargem}>Margem de segurança</Text>
                            <Text style={styles.ajudaDiario}>
                                A previsão segue a configuração do Django.
                            </Text>
                        </Card>

                        <Text style={styles.rotuloDiario}>Ajuste para evento (opcional)</Text>

                        <Input //adicionar uma condicional para limitar as unidades inseridas
                            accessibilityLabel="Alunos extras para evento"
                            inputMode="numeric"
                            placeholder="Adicionar alunos extras"
                            placeholderTextColor="#315F52"
                            value=""
                            editable={false}
                            style={styles.inputExtras}
                        />

                        <View style={styles.totalDiario}>
                            <Text style={styles.totalLegenda}>Preparo planejado para</Text>
                            <Text style={styles.totalValor}>
                                {totalPlanejado == null ? '—' : `${totalPlanejado.toLocaleString('pt-BR')} alunos`}
                            </Text>
                        </View>

                        <Button
                            label="Salvar planejamento"
                            accessibilityRole="button"
                            disabled={!podeSalvar}
                            style={[styles.salvarDiario, !podeSalvar && styles.desabilitado]}
                        />

                        {!podeSalvar && (
                            <Text accessibilityLiveRegion="polite" style={styles.ajudaDiario}>
                                A API não aceita planejamento manual com estes campos.
                            </Text>
                        )}
                    </View>
                )}
            </ScrollView>
            {mensal && (
                <View style={styles.acoes}>
                    <Button
                        label="Compartilhar"
                        accessibilityRole="button"
                        onPress={() => setCompartilharAberto(true)}
                        style={[
                            styles.botao,
                            styles.botaoSecundario,
                        ]}
                        textStyle={styles.textoSecundario}

                    />

                    <Button
                        label="Baixar PDF"
                        accessibilityRole="button"
                        disabled={!onBaixarPdf || estadoPdf?.tipo === 'gerando'}
                        onPress={baixarPdf}
                        style={[styles.botao, !onBaixarPdf && styles.desabilitado]}
                    />
                </View>
            )}
            <CompartilharRelatorioModal
                visivel={compartilharAberto}
                periodo={relatorio.periodo.toLocaleLowerCase('pt-BR')}
                onFechar={() => setCompartilharAberto(false)}
            />

            <PdfStatusModal
                estado={estadoPdf}
                onFechar={fecharPdf}
                onTentarNovamente={baixarPdf}
                onAbrirPdf={abrirPdf}
            />

            <StatusModal
                visible={false}
                status="error"
                totalAlunos={totalPlanejado ?? 0}
                dataRefeicao={diaRefeicao}
                onClose={() => {}}
                onRetry={() => {}}
                onViewHistory={() => { }}
            />
            <View style={styles.rodape}>
                {abas.map(({ titulo, Icone, ativa, onPress }) => {
                    const cor = ativa ? '#C8DFB9' : '#FFFFFF';  // adicionar navegação entre os icones do rodape

                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa, disabled: !ativa && !onPress }}
                            disabled={!ativa && !onPress}
                            onPress={onPress}
                            style={styles.aba}
                        >
                            <Icone color={cor} size={22} />
                            <Text style={[styles.textoAba, { color: cor }]}>{titulo}</Text>
                        </Pressable>
                    );
                })}
            </View>

        </View>
    );
}