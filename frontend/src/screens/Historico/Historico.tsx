import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { mealTypes, type Group, type MealType, type Metrics } from "../../api/reali";
import { Card } from "../../components/Card/Card";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { Select } from "../../components/select/Select";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";
import { openReportFile } from "../../features/reportFiles";
import { Action, Feedback, Field, isDay, labels, Page, Pagination, Panel, shifted, stamp, today, ui, value } from "../../features/ui";
import { colors } from "../../theme/colors";
import { styles } from "./styles";

const groups: Record<Group, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };
const groupKeys = Object.keys(groups) as Group[];
const mealOptions = Object.entries(mealTypes) as [MealType, string][];
const ALL_MEALS = "Todas as refeições";
const SCHOOL = "Escola selecionada";
const ORGANIZATION = "Visão institucional";
const primaryMetrics = [
  ["total_student_entries", "Entradas registradas"],
  ["total_forecast_plates", "Pratos previstos"],
  ["total_served_plates", "Pratos servidos"],
] as const;
const showDate = (date: string) => date.split("-").reverse().join("/");

function Totals({ data, entriesOnly = false }: { data: Metrics; entriesOnly?: boolean }) {
  return (
    <>
      <View style={styles.totals}>
        {(entriesOnly ? primaryMetrics.slice(0, 1) : primaryMetrics).map(([field, title]) => (
          <View key={field} style={styles.total}>
            <Text style={styles.caption}>{title}</Text>
            <Text style={styles.totalValue}>{value(data[field])}</Text>
          </View>
        ))}
      </View>
      {!entriesOnly && (
        <>
          <Text style={styles.caption}>Desvio {value(data.forecast_difference)} · Erro absoluto {value(data.absolute_error)} · Erro (%) {value(data.percentage_error)}</Text>
          <Text style={styles.caption}>MAE {value(data.mae)} · WAPE (%) {value(data.wape)}</Text>
        </>
      )}
      <Text style={styles.caption}>
        {labels(data.data_status)} · Cobertura {data.coverage}/{data.expected}
        {data.calculated_at ? ` · Atualizado em ${stamp(data.calculated_at)}` : ""}
      </Text>
    </>
  );
}

function ReportExports({ filters, group, enabled }: {
  filters: { school?: string; start_date: string; end_date: string; meal_type?: MealType };
  group: Group;
  enabled: boolean;
}) {
  const workspace = useSession().workspace!;
  const action = useAction();

  function share(format: "csv" | "pdf") {
    void action.run(async () => {
      const bytes = await api.report(workspace.scope, { ...filters, group }, format);
      await openReportFile(bytes, format, workspace.scope.signal);
    });
  }

  return (
    <View style={styles.summary}>
      <Feedback loading={action.busy} error={action.error} />
      <View style={styles.exportActions}>
        <View style={styles.exportButton}><Action title="Exportar PDF" variant="primary" disabled={!enabled || action.busy} onPress={() => share("pdf")} /></View>
        <View style={styles.exportButton}><Action title="Exportar CSV" variant="flat" disabled={!enabled || action.busy} onPress={() => share("csv")} /></View>
      </View>
    </View>
  );
}

function Trend({ rows, entryOnly }: { rows: Metrics[]; entryOnly: boolean }) {
  const [key, setKey] = useState<typeof primaryMetrics[number][0]>("total_student_entries");
  const [shown, setShown] = useState(false);
  if (!rows.length) return null;
  if (!shown) return <Action title="Mostrar gráfico" variant="flat" onPress={() => setShown(true)} />;
  const max = Math.max(1, ...rows.map(row => row[key] ?? 0));

  return (
    <Panel title="Evolução do indicador">
      <View style={ui.row}>
        {(entryOnly ? primaryMetrics.slice(0, 1) : primaryMetrics).map(([metric, label]) =>
          <Action key={metric} title={label} variant={metric === key ? undefined : "flat"} onPress={() => setKey(metric)} />)}
      </View>
      <Text style={styles.caption}>Escala desta página de 0 a {value(max)}</Text>
      {rows.filter(row => row.date).map(row => (
        <View key={row.date} style={styles.chartRow}>
          <Text style={ui.text}>{row.date && showDate(row.date)} · {value(row[key])}</Text>
          {row[key] != null && (
            <View accessibilityElementsHidden style={styles.chartTrack}>
              <View style={[styles.chartValue, { width: `${Math.max(0, row[key] / max) * 100}%` }]} />
            </View>
          )}
        </View>
      ))}
    </Panel>
  );
}

export default function Historico() {
  const session = useSession();
  const workspace = session.workspace!;
  const [start, setStart] = useState(() => shifted(today(), -6));
  const [end, setEnd] = useState(today);
  const [group, setGroup] = useState<Group>("daily");
  const [type, setType] = useState<MealType>();
  const [page, setPage] = useState(1);
  const [comparisonPage, setComparisonPage] = useState(1);
  const [mode, setMode] = useState<"school" | "organization">("school");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const rangeDays = isDay(start) && isDay(end) ? (Date.parse(end) - Date.parse(start)) / 86400000 + 1 : 0;
  const valid = rangeDays > 0 && rangeDays <= 366;
  const filters = { school: mode === "school" ? workspace.school!.id : undefined, start_date: start, end_date: end, meal_type: type };
  const allowed = session.can("analytics_reports");
  const entryOnly = !session.can("meal_history");
  const key = JSON.stringify(filters);
  const history = useRemote(`history:${group}:${key}:${page}`, signal => api.history(workspace.scope, group, { ...filters, page }, signal), valid);
  const summary = useRemote(`summary:${key}`, signal => api.summary(workspace.scope, filters, signal), valid && allowed);
  const schools = useRemote(`school-comparison:${key}:${comparisonPage}`, signal => api.comparison(workspace.scope, { ...filters, page: comparisonPage }, signal), valid && allowed && mode === "organization");

  function refresh() { history.refresh(); summary.refresh(); schools.refresh(); }
  function resetPages() { setPage(1); setComparisonPage(1); }

  return (
    <Page management title="Histórico" refresh={refresh} refreshing={history.loading}
      footer={allowed && <ReportExports filters={filters} group={group} enabled={valid && rangeDays <= 90} />}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>Histórico da merenda</Text>
        <Text style={styles.caption}>{mode === "school" ? workspace.school!.name : workspace.organization.name}</Text>
      </View>
      <View style={styles.filters}>
        <View style={styles.fields}>
          <View style={styles.field}><Field label="Data inicial" value={start} maxLength={10} placeholder="AAAA-MM-DD" style={styles.fieldInput}
            onChangeText={next => { setStart(next); resetPages(); }} /></View>
          <View style={styles.field}><Field label="Data final" value={end} maxLength={10} placeholder="AAAA-MM-DD" style={styles.fieldInput}
            onChangeText={next => { setEnd(next); resetPages(); }} /></View>
        </View>
        {!valid && <Text accessibilityRole="alert" style={ui.error}>Informe datas no formato AAAA-MM-DD e um período de até 366 dias.</Text>}
        {(!entryOnly || allowed) && (
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} aria-expanded={filtersOpen}
            style={styles.expand} onPress={() => setFiltersOpen(!filtersOpen)}>
            <Text style={styles.expandText}>Filtros da consulta</Text>
            {filtersOpen ? <ChevronUp size={17} color={colors.secondary} /> : <ChevronDown size={17} color={colors.secondary} />}
          </Pressable>
        )}
        {filtersOpen && !entryOnly && <Select label="Refeição" options={[ALL_MEALS, ...mealOptions.map(([, label]) => label)]}
          value={type ? mealTypes[type] : ALL_MEALS}
          onChange={next => { setType(mealOptions.find(([, label]) => label === next)?.[0]); resetPages(); }} />}
        {filtersOpen && allowed && <Select label="Escopo" options={[SCHOOL, ORGANIZATION]} value={mode === "school" ? SCHOOL : ORGANIZATION}
          onChange={next => { setMode(next === SCHOOL ? "school" : "organization"); resetPages(); }} />}
      </View>
      <SegmentedControl variant="underline" opcoes={groupKeys.map(option => groups[option])} selecionado={groups[group]}
        aoSelecionar={selected => {
          const option = groupKeys.find(key => groups[key] === selected);
          if (option) { setGroup(option); setPage(1); }
        }} />
      <Feedback loading={history.loading || summary.loading || schools.loading} error={history.error ?? summary.error ?? schools.error}
        empty={history.data?.results.every(row => row.data_status === "NO_DATA")} retry={refresh} />

      {summary.data && (
        <View style={styles.summary}>
          <Text accessibilityRole="header" style={styles.title}>Resumo do período</Text>
          <View style={styles.highlights}>
            {primaryMetrics.filter(([field]) => field !== "total_forecast_plates").map(([field, label]) => (
              <View style={styles.highlight} key={field}>
                <Text style={styles.highlightLabel}>{label}</Text>
                <Text style={styles.highlightValue}>{value(summary.data?.summary[field])}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: comparisonOpen }} aria-expanded={comparisonOpen}
            style={styles.expand} onPress={() => setComparisonOpen(!comparisonOpen)}>
            <Text style={styles.expandText}>Comparar com o período anterior</Text>
            {comparisonOpen ? <ChevronUp size={17} color={colors.secondary} /> : <ChevronDown size={17} color={colors.secondary} />}
          </Pressable>
          {comparisonOpen && (
            <Panel>
              <Text style={styles.caption}>{showDate(summary.data.previous_period.start_date)} a {showDate(summary.data.previous_period.end_date)}</Text>
              {primaryMetrics.map(([field, label]) => (
                <Text key={field} style={styles.caption}>
                  {label} · Atual {value(summary.data?.summary[field])} · Anterior {value(summary.data?.previous[field])} · Variação {value(summary.data?.comparison[field])}
                </Text>
              ))}
            </Panel>
          )}
        </View>
      )}

      {schools.data && (
        <View style={styles.recordSection}>
          <Text style={styles.title} accessibilityRole="header">Comparação entre escolas</Text>
          {schools.data.results.map(row => (
            <Card key={row.school_id} style={styles.record}>
              <Text style={styles.date}>{workspace.schools.find(item => item.id === row.school_id)?.name ?? "Escola autorizada"}</Text>
              <Totals data={row} />
            </Card>
          ))}
          <Pagination page={comparisonPage} next={Boolean(schools.data.next)} onChange={setComparisonPage} />
        </View>
      )}

      {history.data && (
        <View style={styles.recordSection}>
          {history.data.results.length > 0 && <Text style={styles.title} accessibilityRole="header">Registros do período</Text>}
          <Trend rows={history.data.results} entryOnly={entryOnly} />
          {history.data.results.map(row => (
            <Card key={row.date} style={styles.record}>
              <Text style={styles.date}>{row.date && showDate(row.date)}</Text>
              <Totals data={row} entriesOnly={entryOnly} />
            </Card>
          ))}
          <Pagination page={page} next={Boolean(history.data.next)} onChange={setPage} />
        </View>
      )}
      {allowed && valid && rangeDays > 90 && <Text style={styles.caption}>A exportação aceita um período de até 90 dias.</Text>}
    </Page>
  );
}
