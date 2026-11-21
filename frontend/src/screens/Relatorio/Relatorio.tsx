import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { mealStatuses, mealTypes, type MealType, type Metrics, type Summary } from '../../api/reali';
import { reportMonths } from '../../api/reportPeriods';
import { BarList } from '../../components/BarList/BarList';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { CompartilharRelatorioModal } from '../../components/CompartilhaRelatorioModal/CompartilhaRelatorioModal';
import { DateField } from '../../components/DateField/DateField';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { Logo } from '../../components/Logo/Logo';
import { PdfStatusModal, type EstadoPdf } from '../../components/PdfStatusModal/PdfStatusModal';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { Select } from '../../components/select/Select';
import { openReportFile } from '../../features/reportFiles';
import { Action, Feedback, isDay, labels, mutationError, Page, Pagination, shifted, stamp, today, ui, value } from '../../features/ui';
import { useAction } from '../../hooks/useAction';
import { useRemote } from '../../hooks/useRemote';
import { api, useSession } from '../../session/provider';
import { DraftPlanner, type Drafts } from './DraftPlanner';
import { styles } from './styles';

const ALL_MEALS = 'Todas as refeições';
const SCHOOL = 'Escola selecionada';
const ORGANIZATION = 'Visão institucional';
const mealOptions = Object.entries(mealTypes) as [MealType, string][];
const showDate = (date: string) => date.split('-').reverse().join('/');

function Indicators({ data, summary, period, scopeLabel, entriesOnly }: {
    data: Metrics;
    summary?: Summary;
    period: string;
    scopeLabel: string;
    entriesOnly: boolean;
}) {
    const indicators = [
        { field: 'total_student_entries', title: 'Entradas registradas', chart: 'Entradas' },
        { field: 'total_served_plates', title: 'Refeições servidas', chart: 'Servidos' },
        { field: 'total_forecast_plates', title: 'Pratos previstos', chart: 'Previstos' },
    ] as const;
    const visible = entriesOnly ? indicators.slice(0, 1) : indicators;
    const bars = visible.flatMap(({ field, chart }) => {
        const count = data[field];
        return count == null ? [] : [{ nome: chart, valor: count }];
    });

    return (
        <Card style={styles.relatorio}>
            <Logo style={styles.marca} />
            <Text accessibilityRole="header" style={styles.tituloRelatorio}>Resumo do atendimento escolar</Text>
            <Text style={styles.info}>{scopeLabel} · {period}</Text>
            <View style={styles.indicadores}>
                {visible.map(({ field, title }) => (
                    <View key={field} style={styles.indicador}>
                        <Kpicard title={title} value={data[field]} />
                    </View>
                ))}
            </View>
            {bars.length > 0 && (
                <>
                    <Text accessibilityRole="header" style={styles.subtitulo}>Entradas e refeições</Text>
                    <BarList itens={bars} unidade="" />
                </>
            )}
            {summary && (
                <>
                    <Text accessibilityRole="header" style={styles.subtitulo}>Variação em relação ao período anterior</Text>
                    <Text style={styles.info}>
                        {showDate(summary.previous_period.start_date)} a {showDate(summary.previous_period.end_date)}
                    </Text>
                    {visible.map(({ field, title }) => {
                        const delta = summary.comparison[field];
                        return <Text key={field} style={styles.comparacao}>{title} · {delta != null && delta > 0 ? '+' : ''}{value(delta)}</Text>;
                    })}
                </>
            )}
            <View style={styles.qualidade}>
                <Text accessibilityRole="header" style={styles.subtitulo}>Qualidade dos dados</Text>
                <Text style={styles.info}>{labels(data.data_status)} · Cobertura {data.coverage}/{data.expected}</Text>
                {data.calculated_at && <Text style={styles.info}>Atualizado em {stamp(data.calculated_at)}</Text>}
                {!entriesOnly && (
                    <>
                        <Text style={styles.info}>Desvio {value(data.forecast_difference)} · Erro absoluto {value(data.absolute_error)} · Erro percentual {value(data.percentage_error)}</Text>
                        <Text style={styles.info}>MAE {value(data.mae)} · WAPE (%) {value(data.wape)} · Serviços comparados {data.compared_services}</Text>
                    </>
                )}
            </View>
        </Card>
    );
}

export default function Relatorio() {
    const session = useSession();
    const workspace = session.workspace!;
    const school = workspace.school!;
    const router = useRouter();
    const canExport = session.can('analytics_reports');
    const canSeeMeals = session.can('meal_history');
    const canPlan = session.can('manage_meals');
    const now = today();
    const limited = ['COOK', 'TEACHER'].includes(workspace.member.role);
    const earliest = limited ? shifted(now, -29) : '1900-01-01';
    const months = reportMonths(now, earliest);
    const [mode, setMode] = useState('Mensal');
    const [month, setMonth] = useState(months[0].label);
    const [date, setDate] = useState(now);
    const [scopeChoice, setScopeChoice] = useState(SCHOOL);
    const [mealType, setMealType] = useState<MealType>();
    const [page, setPage] = useState(1);
    const [planningMealId, setPlanningMealId] = useState<string>();
    const [drafts, setDrafts] = useState<Drafts>({});
    const [shareOpen, setShareOpen] = useState(false);
    const [pdf, setPdf] = useState<EstadoPdf | null>(null);
    const pdfRequest = useRef<AbortController | null>(null);
    const openingPdf = useRef(false);
    const retryAsShare = useRef(false);
    const csv = useAction();

    const monthly = mode === 'Mensal';
    const organization = canExport && scopeChoice === ORGANIZATION;
    const schoolId = organization ? undefined : school.id;
    const scopeLabel = organization ? workspace.organization.name : school.name;
    const selectedMonth = months.find(option => option.label === month) ?? months[0];
    const monthRange = selectedMonth.range;
    const validDate = isDay(date) && date >= earliest;
    const dayFilters = { school: schoolId, date, meal_type: canSeeMeals ? mealType : undefined };
    const monthFilters = { school: schoolId, ...monthRange };
    const monthKey = JSON.stringify(monthFilters);
    const dayKey = JSON.stringify(dayFilters);
    const exportFilters = monthly ? { ...monthFilters, group: 'monthly' } : { ...dayFilters, group: 'daily' };
    const period = monthly ? selectedMonth.label : showDate(date);

    const monthReport = useRemote(`monthly-summary:${monthKey}`, signal => api.summary(workspace.scope, monthFilters, signal), monthly && canExport);
    const monthHistory = useRemote(`monthly-history:${monthKey}`, signal => api.history(workspace.scope, 'monthly', monthFilters, signal), monthly && !canExport);
    const dayReport = useRemote(`daily-report:${dayKey}`, signal => api.dashboard(workspace.scope, dayFilters, signal), !monthly && validDate);
    const dayMeals = useRemote(`daily-report-meals:${dayKey}:${page}`, signal => api.mealMetrics(workspace.scope, { ...dayFilters, page }, signal), !monthly && validDate && canSeeMeals);
    const report = monthly ? (canExport ? monthReport : monthHistory) : dayReport;
    const data = monthly ? (canExport ? monthReport.data?.summary : monthHistory.data?.results[0]) : dayReport.data;
    const loading = report.loading || (!monthly && canSeeMeals && dayMeals.loading);
    const exportDisabled = (!monthly && !validDate) || csv.busy || pdf?.tipo === 'gerando';

    useEffect(() => () => pdfRequest.current?.abort(), []);

    function refresh() {
        report.refresh();
        if (!monthly && canSeeMeals) dayMeals.refresh();
    }

    function resetDailySelection() {
        setPage(1);
        setPlanningMealId(undefined);
        csv.setError(null);
    }

    function closePdf() {
        pdfRequest.current?.abort();
        pdfRequest.current = null;
        setPdf(null);
    }

    async function preparePdf(share = false) {
        if (!canExport || exportDisabled || pdfRequest.current) return;
        const controller = new AbortController();
        pdfRequest.current = controller;
        retryAsShare.current = share;
        setShareOpen(false);
        setPdf({ tipo: 'gerando', periodo: period, progresso: null });
        try {
            const bytes = await api.report(workspace.scope, exportFilters, 'pdf', controller.signal);
            if (controller.signal.aborted || workspace.scope.signal?.aborted) return;
            setPdf({
                tipo: 'pronto',
                arquivo: { nome: 'reali-relatorio.pdf', abrir: () => openReportFile(bytes, 'pdf', workspace.scope.signal, share) },
            });
        } catch (error) {
            if (controller.signal.aborted || workspace.scope.signal?.aborted) return;
            if (error instanceof ApiError && error.status === 403) void session.revalidate();
            setPdf({ tipo: 'erro', mensagem: mutationError(error) });
        } finally {
            if (pdfRequest.current === controller) pdfRequest.current = null;
        }
    }

    async function openPdf() {
        if (!canExport || pdf?.tipo !== 'pronto' || openingPdf.current) return;
        openingPdf.current = true;
        try {
            await pdf.arquivo.abrir();
        } catch (error) {
            setPdf(current => current === pdf ? { ...pdf, erroAoAbrir: mutationError(error) } : current);
        } finally {
            openingPdf.current = false;
        }
    }

    function exportCsv() {
        if (!canExport || exportDisabled) return;
        void csv.run(async () => {
            const bytes = await api.report(workspace.scope, exportFilters, 'csv');
            await openReportFile(bytes, 'csv', workspace.scope.signal);
        });
    }

    return (
        <Page management title="Relatório" refresh={refresh} refreshing={loading} footer={canExport && (
            <View style={styles.acoes}>
                <Button label="Compartilhar" accessibilityRole="button" disabled={exportDisabled} onPress={() => setShareOpen(true)}
                    style={[styles.botao, styles.botaoSecundario, exportDisabled && styles.desabilitado]} textStyle={styles.textoSecundario} />
                <Button label="Baixar PDF" accessibilityRole="button" disabled={exportDisabled} onPress={() => void preparePdf()}
                    style={[styles.botao, exportDisabled && styles.desabilitado]} textStyle={styles.textoBotao} />
                <Button label="Baixar CSV" accessibilityRole="button" disabled={exportDisabled} onPress={exportCsv}
                    style={[styles.botao, styles.botaoSecundario, exportDisabled && styles.desabilitado]} textStyle={styles.textoSecundario} />
            </View>
        )}>
                <SegmentedControl variant="underline" opcoes={['Mensal', 'Diário']} selecionado={mode}
                    aoSelecionar={option => { setMode(option); resetDailySelection(); }} />
                <View style={styles.filtros}>
                {canExport && (
                    <Select variant="relatorio" label="Escopo do relatório" options={[SCHOOL, ORGANIZATION]}
                        value={scopeChoice} onChange={option => { setScopeChoice(option); resetDailySelection(); }} />
                )}
                {monthly ? (
                    <Select variant="relatorio" label="Mês do relatório" options={months.map(option => option.label)}
                        value={selectedMonth.label} onChange={option => { setMonth(option); csv.setError(null); }} />
                ) : (
                    <>
                        <DateField label="Data do relatório" value={date} minDate={earliest} maxDate={now}
                            onChange={next => { setDate(next); resetDailySelection(); }} />
                        {!validDate && <Text accessibilityRole="alert" style={ui.error}>Selecione uma data no período permitido.</Text>}
                        {canSeeMeals && (
                            <Select variant="relatorio" label="Refeição" options={[ALL_MEALS, ...mealOptions.map(([, label]) => label)]}
                                value={mealType ? mealTypes[mealType] : ALL_MEALS}
                                onChange={option => { setMealType(mealOptions.find(([, label]) => label === option)?.[0]); resetDailySelection(); }} />
                        )}
                    </>
                )}
                </View>
                <Feedback loading={loading} error={report.error ?? (!monthly && canSeeMeals ? dayMeals.error : undefined)}
                    empty={data?.data_status === 'NO_DATA' || (monthly && monthHistory.data?.results.length === 0)}
                    stale={Boolean(data?.stale) || data?.data_status === 'PROVISIONAL'} retry={refresh} />
                {!monthly && canSeeMeals && validDate && dayMeals.data && (
                    <>
                        {dayMeals.data.results.length > 0 && <Text accessibilityRole="header" style={styles.tituloRelatorio}>Refeições do dia</Text>}
                        {dayMeals.data.results.map(meal => (
                            <Card key={meal.id} style={styles.refeicao}>
                                <Text style={styles.subtitulo}>{mealTypes[meal.meal_type]} · {mealStatuses[meal.status]}</Text>
                                <Text style={styles.info}>Entradas na captura {value(meal.snapshot_entries)} · Previstos {value(meal.total_forecast_plates)} · Servidos {value(meal.total_served_plates)}</Text>
                                <Text style={styles.info}>{labels(meal.data_quality)} · Desvio {value(meal.forecast_difference)} · Erro absoluto {value(meal.absolute_error)}</Text>
                                {!organization && (
                                    <View style={ui.row}>
                                        <Action title="Ver serviço" variant="flat" onPress={() => router.push({ pathname: '/servico', params: { id: meal.id } })} />
                                        {canPlan && meal.status !== 'CANCELLED' && planningMealId !== meal.id &&
                                            <Action title="Planejar preparo" variant="primary" onPress={() => setPlanningMealId(meal.id)} />}
                                    </View>
                                )}
                                {!organization && canPlan && meal.status !== 'CANCELLED' && planningMealId === meal.id && (
                                    <DraftPlanner meal={meal} draft={drafts[meal.id]}
                                        onChange={draft => setDrafts(previous => ({ ...previous, [meal.id]: draft }))}
                                        onHistory={() => router.push('/historico')} />
                                )}
                            </Card>
                        ))}
                        <Pagination page={page} next={Boolean(dayMeals.data.next)} onChange={next => { setPage(next); setPlanningMealId(undefined); }} />
                    </>
                )}
                {data && <Indicators data={data} summary={monthly && canExport ? monthReport.data : undefined}
                    period={period} scopeLabel={scopeLabel} entriesOnly={!canSeeMeals} />}
                <Action title="Ver histórico" variant="flat" onPress={() => router.push('/historico')} />
                <Feedback loading={csv.busy} error={csv.error} />
            {canExport && <CompartilharRelatorioModal visivel={shareOpen} periodo={period}
                onFechar={() => setShareOpen(false)} onWhatsApp={() => void preparePdf(true)} onEmail={() => void preparePdf(true)} />}
            {canExport && <PdfStatusModal estado={pdf} onFechar={closePdf}
                onTentarNovamente={() => void preparePdf(retryAsShare.current)} onAbrirPdf={() => void openPdf()} />}
        </Page>
    );
}
