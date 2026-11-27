
import { useEffect, useState, useRef } from 'react';
import { Modal, Platform, ScrollView, Text, View, Pressable } from 'react-native';
import { ClipboardList, History, House, TrendingUp } from 'lucide-react-native';

import { BarList } from '../../components/BarList/BarList';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Header } from '../../components/Header/header';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { Select } from '../../components/Select/Select';
import { Logo } from '../../components/Logo/Logo';
import { Input } from '../../components/Input/Input';
import { CompartilharRelatorioModal } from '../../components/CompartilhaRelatorioModal/CompartilhaRelatorioModal';
import { PdfStatusModal, type EstadoPdf } from '../../components/PdfStatusModal/PdfStatusModal';

import { mealTypes } from '../../api/reali';
import { api, useSession } from '../../session/provider';
import { useRemote } from '../../hooks/useRemote';
import { dateLabel, localDate, monthRange } from '../../services/dates';
import { prepararArquivoPdf, type CanalRelatorio } from '../../services/reportPdf';
import { styles } from './styles';

type FormularioResumoProps = {
    onInicioPress?: () => void;
    onRelatoriosPress?: () => void;
    onCardapioPress?: () => void;
    onHistoricoPress?: () => void;
};

export default function Relatorio({ onInicioPress, onRelatoriosPress, onCardapioPress, onHistoricoPress }: FormularioResumoProps = {}) {
    const abas = [
        { titulo: 'Início', Icone: House, onPress: onInicioPress },
        { titulo: 'Relatórios', Icone: TrendingUp, ativa: true, onPress: onRelatoriosPress },
        { titulo: 'Cardápio', Icone: ClipboardList, onPress: onCardapioPress },
        { titulo: 'Histórico', Icone: History, onPress: onHistoricoPress },
    ];

    const [modo, setModo] = useState('Mensal');
    const { workspace, can } = useSession();
    const canReport = can('analytics_reports');
    const canDaily = can('meal_history');
    const mensal = !canDaily || modo === 'Mensal';
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
    const range = monthRange(month.key);
    const query = { school: school?.id, ...range, end_date: range.end_date > today ? today : range.end_date };
    const report = useRemote('report/' + month.key, signal => api.summary(scope!, query, signal), Boolean(scope && school && canReport && mensal));
    const meals = useRemote('meal-metrics/' + month.key, signal =>
        api.all(() => api.mealMetrics(scope!, query, signal), { scope, signal }),
        Boolean(scope && school && canReport && !mensal));

    const mealOptions = (meals.data ?? []).map(item => ({
        item, label: dateLabel(item.reference_date) + ' · ' + mealTypes[item.meal_type],
    }));

    const meal = mealOptions.find(option => option.label === selectedMeal) ?? mealOptions[0];
    const diaRefeicao = meal?.label ?? '';
    const [compartilharAberto, setCompartilharAberto] = useState(false);
    const [estadoPdf, setEstadoPdf] = useState<EstadoPdf | null>(null);
    const [acaoEmCurso, setAcaoEmCurso] = useState(false);
    const exportacao = useRef<AbortController | null>(null);
    const acionando = useRef(false);
    const metrics = report.data?.summary;
    const relatorio = {
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
    const periodoPdf = mensal ? month.label : diaRefeicao;
    const podeExportar = canReport && Boolean(scope && school && (mensal || meal));

    useEffect(() => () => {
        exportacao.current?.abort();
        exportacao.current = null;
    }, []);

    async function gerarPdf(canal?: CanalRelatorio) {
        if (!podeExportar || !scope || !school || exportacao.current) return;
        const refeicao = meal?.item;
        if (!mensal && !refeicao) return;

        const controle = new AbortController();
        const diaria = !mensal ? refeicao : undefined;
        const filtros = diaria
            ? { school: school.id, date: diaria.reference_date, meal_type: diaria.meal_type, group: 'daily' }
            : { ...query, group: 'monthly' };
        const nome = diaria ? `reali-${diaria.reference_date}-${diaria.meal_type}.pdf` : `reali-${month.key}.pdf`;

        setCompartilharAberto(false);
        exportacao.current = controle;
        setEstadoPdf({ tipo: 'gerando', periodo: periodoPdf });

        try {
            const pdf = await api.report(scope, filtros, 'pdf', controle.signal);
            const arquivo = prepararArquivoPdf(pdf, nome, `Relatório Reali · ${periodoPdf}`, school.id, () => {
                if (controle.signal.aborted || scope.signal?.aborted) throw new Error('A exportação foi cancelada.');
            });

            if (!controle.signal.aborted && exportacao.current === controle) {
                setEstadoPdf({ tipo: 'pronto', arquivo, canal });
            }
        } catch {
            if (!controle.signal.aborted && exportacao.current === controle) {
                exportacao.current = null;
                setEstadoPdf({ tipo: 'erro', canal });
            }
        }
    }

    function fecharPdf() {
        const controle = exportacao.current;
        exportacao.current = null;
        controle?.abort();
        setEstadoPdf(null);
    }

    async function executarAcaoPdf(acao: 'baixar' | 'compartilhar' | 'abrirCanal') {
        if (estadoPdf?.tipo !== 'pronto' || acionando.current) return;

        const { arquivo, canal } = estadoPdf;
        acionando.current = true;
        setAcaoEmCurso(true);
        setEstadoPdf({ ...estadoPdf, erroAcao: undefined });

        try {
            if (acao === 'baixar') {
                await arquivo.baixar();
                setEstadoPdf(atual => atual?.tipo === 'pronto' && atual.arquivo === arquivo
                    ? { ...atual, avisoAcao: Platform.OS === 'web' ? 'Download iniciado.' : 'PDF salvo.' }
                    : atual);
            } else if (acao === 'compartilhar' && canal) await arquivo.compartilhar?.(canal);
            else if (canal) await arquivo.abrirCanal(canal);
        } catch (error) {
            if (error instanceof Error && (
                error.name === 'AbortError' || /picker\s+was cancelled|picking was cancelled/i.test(error.message)
            )) return;
            setEstadoPdf((atual) =>
                atual?.tipo === 'pronto' && atual.arquivo === arquivo
                    ? {
                        ...atual,
                        semAnexo: atual.semAnexo || acao === 'compartilhar',
                        erroAcao: acao === 'baixar'
                            ? 'Não foi possível salvar o PDF.'
                            : acao === 'abrirCanal' ? `Não foi possível abrir ${canal}.` : 'Não foi possível compartilhar o arquivo.',
                    }
                    : atual
            );
        } finally {
            acionando.current = false;
            setAcaoEmCurso(false);
        }
    }

    return (
        <View style={styles.screen}>
            <Header
                name="Relatório"
                right={null}
                containerStyle={styles.header}
                titleStyle={styles.headerTitle}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {canDaily && <SegmentedControl
                    opcoes={['Mensal', 'Diário']}
                    selecionado={modo}
                    aoSelecionar={setModo}
                />}

                {mensal ? (
                    <>
                        <Select
                            variant='relatorio'
                            label={mensal ? 'Mês do relatório' : 'Dia do relatório'}
                            options={months.map(item => item.label)}
                            value={month.label}
                            onChange={setMes}
                        />

                        <Card style={styles.report}>
                            <Logo style={styles.brand} />

                            <Text accessibilityRole="header" style={styles.reportTitle}>
                                Resumo do atendimento escolar
                            </Text>

                            <Text style={styles.info}>
                                {school?.name ?? '—'} · {relatorio.periodo}
                            </Text>

                            <View style={styles.indicators}>
                                <View style={styles.indicator}>
                                    <Kpicard title="Total de alunos registrados" value={metrics?.total_student_entries ?? null} />
                                </View>

                                <View style={styles.indicator}>
                                    <Kpicard title="Refeições servidas" value={metrics?.total_served_plates ?? null} />
                                </View>
                            </View>

                            <Text accessibilityRole="header" style={styles.subtitle}>
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
                                <Text style={styles.comparison}>
                                    {simbolo} Em relação ao período anterior: {textoComparacao}
                                </Text>
                            )}

                            <Text accessibilityRole="header" style={styles.subtitle}>
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
                    <View style={styles.daily}>
                        <Text style={styles.dailyLabel}>Data e refeição</Text>

                        <Select
                            variant="relatorio"
                            label="Data e refeição"
                            options={mealOptions.map(option => option.label)}
                            value={diaRefeicao}
                            onChange={setDiaRefeicao}
                        />

                        <Text style={styles.dailyLabel}>Total de alunos registrados</Text>

                        <Input
                            accessibilityLabel="Total de alunos registrados"
                            inputMode="numeric"
                            placeholder="Informe o total"
                            placeholderTextColor="#E6F2DA"
                            value={meal?.item.snapshot_entries?.toString() ?? ''}
                            editable={false}
                            style={styles.dailyInput}
                        />

                        <Text style={styles.dailyHelp}>
                            {meals.error?.message ?? 'Total registrado pelo Django.'}
                        </Text>

                        <Card style={styles.marginCard}>
                            <Text style={styles.marginTitle}>Margem de segurança</Text>
                            <Text style={styles.dailyHelp}>
                                A previsão segue a configuração do Django.
                            </Text>
                        </Card>

                        <View style={styles.dailyTotal}>
                            <Text style={styles.totalLabel}>Preparo planejado para</Text>
                            <Text style={styles.totalValue}>
                                {totalPlanejado == null ? '—' : `${totalPlanejado.toLocaleString('pt-BR')} alunos`}
                            </Text>
                        </View>

                    </View>
                )}
            </ScrollView>
            <View style={styles.actions}>
                <Button
                    label="Compartilhar"
                    accessibilityRole="button"
                    disabled={!podeExportar}
                    onPress={() => setCompartilharAberto(true)}
                    style={[styles.button, styles.secondaryButton, !podeExportar && styles.disabled]}
                    textStyle={styles.secondaryText}
                />

                <Button
                    label="Baixar PDF"
                    accessibilityRole="button"
                    disabled={!podeExportar}
                    onPress={() => void gerarPdf()}
                    style={[styles.button, !podeExportar && styles.disabled]}
                />
            </View>
            <Modal
                visible={compartilharAberto || estadoPdf !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (compartilharAberto) setCompartilharAberto(false);
                    else if (!acaoEmCurso) fecharPdf();
                }}
            >
                {compartilharAberto ? (
                    <CompartilharRelatorioModal
                        periodo={periodoPdf}
                        onFechar={() => setCompartilharAberto(false)}
                        onWhatsApp={() => void gerarPdf('WhatsApp')}
                        onEmail={() => void gerarPdf('E-mail')}
                    />
                ) : (
                    <PdfStatusModal
                        estado={estadoPdf}
                        onFechar={fecharPdf}
                        ocupado={acaoEmCurso}
                        onTentarNovamente={() => void gerarPdf(estadoPdf?.tipo === 'erro' ? estadoPdf.canal : undefined)}
                        onBaixarPdf={() => void executarAcaoPdf('baixar')}
                        onCompartilhar={() => void executarAcaoPdf('compartilhar')}
                        onAbrirCanal={() => void executarAcaoPdf('abrirCanal')}
                    />
                )}
            </Modal>
            <View style={styles.footer}>
                {abas.filter(aba => aba.ativa || aba.onPress).map(({ titulo, Icone, ativa, onPress }) => {
                    const cor = ativa ? '#C8DFB9' : '#FFFFFF';  // adicionar navegação entre os icones do rodape

                    return (
                        <Pressable
                            key={titulo}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: !!ativa }}
                            onPress={onPress}
                            style={styles.tab}
                        >
                            <Icone color={cor} size={22} />
                            <Text style={[styles.tabText, { color: cor }]}>{titulo}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
