import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { mealTypes, type MealStatus, type MealType } from '../../api/reali';
import { BottomTabs } from '../../components/BottomTabs/BottomTabs';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Header } from '../../components/header/header';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { PeriodSelector } from '../../components/PeriodSelector/PeriodSelector';
import { Select } from '../../components/select/Select';
import { useRemote } from '../../hooks/useRemote';
import { addDays, dateLabel, localDate, weekDays } from '../../services/dates';
import { prepararArquivoPdf } from '../../services/reportPdf';
import { api, useSession } from '../../session/provider';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const options = Object.entries(mealTypes) as [MealType, string][];
const statuses: Record<MealStatus, string> = {
    PLANNED: 'Planejada',
    PREPARING: 'Em preparo',
    SERVING: 'Em distribuição',
    FINISHED: 'Finalizada',
    CANCELLED: 'Cancelada',
};

type Props = {
    onInicioPress: () => void;
    onRelatoriosPress: () => void;
    onCardapioPress: () => void;
};

const quantity = (value: number | null) => value?.toLocaleString('pt-BR') ?? '—';

export default function Historico({ onInicioPress, onRelatoriosPress, onCardapioPress }: Props) {
    const { workspace } = useSession();
    const scope = workspace?.scope;
    const school = workspace?.school;
    const [mealType, setMealType] = useState<MealType>('LUNCH');
    const [weekOffset, setWeekOffset] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const exportController = useRef<AbortController | null>(null);

    const today = localDate();
    const week = weekDays(addDays(today, weekOffset * 7));
    const start = week[0];
    const end = week[6] > today ? today : week[6];
    const period = `${dateLabel(start)} a ${dateLabel(end)}`;
    const query = { school: school?.id, meal_type: mealType, start_date: start, end_date: end };
    const history = useRemote(`history/${start}/${end}/${mealType}`, signal => api.all(
        () => api.mealMetrics(scope!, query, signal), { scope, signal }
    ), Boolean(scope && school));

    const meals = history.data ?? [];
    const activeMeals = meals.filter(meal => meal.status !== 'CANCELLED');
    const daysWithForecast = new Set(activeMeals.filter(meal => meal.total_forecast_plates != null).map(meal => meal.reference_date));
    const daysWithServed = new Set(activeMeals.filter(meal => meal.total_served_plates != null).map(meal => meal.reference_date));

    useEffect(() => () => {
        exportController.current?.abort();
        exportController.current = null;
    }, []);

    async function download() {
        if (!scope || !school || exportController.current || !activeMeals.length) return;
        const controller = new AbortController();
        exportController.current = controller;
        setExporting(true);
        setExportError('');

        try {
            const pdf = await api.report(scope, { ...query, group: 'daily' }, 'pdf', controller.signal);
            const file = prepararArquivoPdf(pdf, `reali-historico-${start}-${mealType.toLowerCase()}.pdf`,
                `Histórico Reali · ${period}`, school.id, () => {
                    if (controller.signal.aborted || scope.signal?.aborted) throw new Error('A exportação foi cancelada.');
                });
            await file.baixar();
        } catch (error) {
            if (!controller.signal.aborted) {
                setExportError(error instanceof Error ? error.message : 'Não foi possível exportar o resumo.');
            }
        } finally {
            if (exportController.current === controller) {
                exportController.current = null;
                setExporting(false);
            }
        }
    }

    const changeWeek = (offset: number) => {
        if (exportController.current) return;
        setExportError('');
        setWeekOffset(current => Math.min(0, current + offset));
    };

    return (
        <View style={styles.container}>
            <Header name="Histórico de refeições" right={null} titleStyle={styles.headerTitle} />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {school && <Text style={styles.school}>{school.name}</Text>}

                {school && scope ? <>
                    <Select label="Tipo de refeição" options={options.map(([, label]) => label)}
                        value={mealTypes[mealType]} onChange={label => {
                            const match = options.find(([, name]) => name === label);
                            if (match && !exportController.current) {
                                setExportError('');
                                setMealType(match[0]);
                            }
                        }} />
                    <PeriodSelector periodo={period} onAnterior={() => changeWeek(-1)} onProximo={() => changeWeek(1)}
                        disableNext={weekOffset === 0 || exporting} labelAnterior="Semana anterior" labelProximo="Próxima semana" />

                    {history.loading && <ActivityIndicator accessibilityLabel="Carregando histórico" color={colors.secondary} />}
                    {history.error && <>
                        <Text accessibilityRole="alert" style={styles.message}>{history.error.message}</Text>
                        <Button label="Tentar novamente" onPress={history.refresh} />
                    </>}

                    {history.data && <>
                        <View style={styles.indicators}>
                            <Kpicard variant="gestao" title="Dias com previsão" value={daysWithForecast.size} style={styles.indicator} />
                            <Kpicard variant="gestao" title="Dias com contagem de pratos" value={daysWithServed.size} style={styles.indicator} />
                        </View>
                        <Text accessibilityRole="header" style={styles.title}>Registros da semana</Text>
                        {!meals.length && <Text style={styles.message}>Nenhuma refeição registrada neste período.</Text>}
                        {meals.map(meal => (
                            <Card key={meal.id} title={`${dateLabel(meal.reference_date)} · ${mealTypes[meal.meal_type]}`}
                                description={statuses[meal.status]}>
                                <Text style={styles.recordDetail}>Entradas consideradas no preparo · {quantity(meal.snapshot_entries)}</Text>
                                <Text style={styles.recordDetail}>Pratos previstos · {quantity(meal.total_forecast_plates)}</Text>
                                <Text style={styles.recordDetail}>Pratos servidos · {quantity(meal.total_served_plates)}</Text>
                            </Card>
                        ))}
                        {!!activeMeals.length && (
                            <Button label={exporting ? 'Exportando…' : 'Exportar resumo em PDF'}
                                onPress={() => void download()} disabled={exporting || history.loading || Boolean(history.error)} />
                        )}
                    </>}
                    {exportError && <Text accessibilityRole="alert" style={styles.message}>{exportError}</Text>}
                </> : <Text style={styles.message}>Nenhuma escola selecionada para consultar o histórico.</Text>}
            </ScrollView>

            <BottomTabs activeTab="historico" showRelatorios showHistorico showPerfil={false}
                onHomePress={onInicioPress} onRelatoriosPress={onRelatoriosPress}
                onCardapiosPress={onCardapioPress} />
        </View>
    );
}
