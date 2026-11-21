import { useState } from 'react';
import { Text, View } from 'react-native';
import { mealTypes, type MealMetrics } from '../../api/reali';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Input } from '../../components/Input/Input';
import { StatusModal } from '../../components/StatusModal/StatusModal';
import { styles } from './styles';

type Draft = { students: string; extra: string };
export type Drafts = Record<string, Draft>;
const safetyMargin = 0.10;

export function DraftPlanner({ meal, draft, onChange, onHistory }: {
    meal: MealMetrics;
    draft?: Draft;
    onChange: (draft: Draft) => void;
    onHistory: () => void;
}) {
    const [students, setStudents] = useState(draft?.students ?? meal.snapshot_entries?.toString() ?? '');
    const [extra, setExtra] = useState(draft?.extra ?? '');
    const [statusOpen, setStatusOpen] = useState(false);
    const margin = Math.ceil(Number(students) * safetyMargin);
    const total = Number(students) + margin + Number(extra);
    const valid = students !== '' && Number.isSafeInteger(total);
    const saved = draft?.students === students && draft?.extra === extra;

    function save() {
        if (!valid) return;
        onChange({ students, extra });
        setStatusOpen(true);
    }

    return (
        <View style={styles.diario}>
            <Text accessibilityRole="header" style={styles.subtitulo}>Rascunho de planejamento · {mealTypes[meal.meal_type]}</Text>
            <Text style={styles.ajudaDiario}>Os ajustes ficam disponíveis enquanto esta tela estiver aberta.</Text>
            <Text style={styles.rotuloDiario}>Total base de alunos</Text>
            <Input accessibilityLabel="Total base de alunos" inputMode="numeric" placeholder="Informe o total"
                placeholderTextColor="#E6F2DA" value={students} maxLength={10} style={styles.inputDiario}
                onChangeText={text => setStudents(text.replace(/\D/g, ''))} />
            <Card style={styles.cardMargem}>
                <Text style={styles.tituloMargem}>Margem do rascunho de 10%</Text>
                {valid && <Text style={styles.ajudaDiario}>+{margin.toLocaleString('pt-BR')} alunos</Text>}
            </Card>
            <Text style={styles.rotuloDiario}>Ajuste para evento (opcional)</Text>
            <Input accessibilityLabel="Alunos extras para evento" inputMode="numeric" placeholder="Adicionar alunos extras"
                placeholderTextColor="#315F52" value={extra} maxLength={10} style={styles.inputExtras}
                onChangeText={text => setExtra(text.replace(/\D/g, ''))} />
            <View style={styles.totalDiario}>
                <Text style={styles.totalLegenda}>Preparo planejado para</Text>
                <Text style={styles.totalValor}>{valid ? `${total.toLocaleString('pt-BR')} alunos` : '—'}</Text>
            </View>
            <Button label="Salvar rascunho" disabled={!valid} onPress={save}
                style={[styles.salvarDiario, !valid && styles.desabilitado]} />
            {saved && <Text accessibilityLiveRegion="polite" style={styles.ajudaDiario}>Rascunho salvo nesta sessão.</Text>}
            <StatusModal visible={statusOpen} status="success" totalAlunos={total} dataRefeicao={mealTypes[meal.meal_type]}
                localDraft onClose={() => setStatusOpen(false)} onRetry={save}
                onViewHistory={() => { setStatusOpen(false); onHistory(); }} />
        </View>
    );
}
