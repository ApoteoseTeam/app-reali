import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BarList } from '../../components/BarList/BarList';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Header } from '../../components/Header/header';
import { Kpicard } from '../../components/KpiCard/KpiCard';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { Select } from '../../components/Select/Select';
import { Logo } from '../../components/Logo/Logo';
import { Input } from '../../components/Input/Input';

import { styles } from './styles';

const REGISTROS_DEMO = [
    { data: '2026-11-03', alunos: 150, previsao: 158 },
    { data: '2026-11-04', alunos: 148, previsao: 156 },
    { data: '2026-11-05', alunos: 152, previsao: 160 },
];

const MESES = ['Novembro de 2026'];

const DIAS = [
    '03/11/2026',
    '04/11/2026',
    '05/11/2026',
];

type DadosRelatorio = {
    periodo: string;
    alunos: number;
    previsao: number;
};

type FormularioResumoProps = {
    onCompartilhar?: (relatorio: DadosRelatorio) => void;
    onBaixarPdf?: (relatorio: DadosRelatorio) => void;
};

const OPCOES_DIARIAS = [
    '09/11/2026 · Almoço',
    '10/11/2026 · Almoço',
];

const MARGEM_SEGURANCA = 0.10;

type Planejamento = {
    alunos: string;
    extras: string;
};

const PLANEJAMENTO_INICIAL: Planejamento = {
    alunos: '150',
    extras: '',
};

export default function Relatorio({
    onCompartilhar,
    onBaixarPdf,
}: FormularioResumoProps = {}) {
    const [modo, setModo] = useState('Mensal');
    const [mes, setMes] = useState(MESES[0]);
    const [dia, setDia] = useState(DIAS[0]);
    const [diaRefeicao, setDiaRefeicao] = useState(OPCOES_DIARIAS[0]);

    const [rascunhos, setRascunhos] = useState<Record<string, Planejamento>>({
        [OPCOES_DIARIAS[0]]: PLANEJAMENTO_INICIAL,
    });

    const [planejamentosSalvos, setPlanejamentosSalvos] =
        useState<Record<string, Planejamento>>({});

    const mensal = modo === 'Mensal';

    const registros = mensal
        ? REGISTROS_DEMO.filter((registro) =>
            registro.data.startsWith('2026-11')
        )
        : REGISTROS_DEMO.filter(
            (registro) => registro.data.split('-').reverse().join('/') === dia
        );

    const REFERENCIA_DEMO = {
        periodo: 'setembro',
        previsao: 450,
    };

    const relatorio: DadosRelatorio = {
        periodo: mensal ? mes : dia,
        alunos: registros.reduce((total, registro) => total + registro.alunos, 0),
        previsao: registros.reduce(
            (total, registro) => total + registro.previsao,
            0
        ),
    };

    const variacao = REFERENCIA_DEMO.previsao > 0 //adicionar conexao com backend para o calculo variavel
        ? ((relatorio.previsao - REFERENCIA_DEMO.previsao)
            / REFERENCIA_DEMO.previsao) * 100
        : null;

    const percentual = variacao === null
        ? ''
        : Math.abs(variacao).toLocaleString('pt-BR', {
            maximumFractionDigits: 1,
        });

    let simbolo = '–';
    let textoComparacao = 'a previsão de atendimento ficou estável.';

    if (variacao !== null && variacao > 0) {
        simbolo = '▲';
        textoComparacao = `a previsão de atendimento aumentou ${percentual}%.`;
    } else if (variacao !== null && variacao < 0) {
        simbolo = '▼';
        textoComparacao = `a previsão de atendimento caiu ${percentual}%.`;
    }


    const planejamento = rascunhos[diaRefeicao] ?? { alunos: '', extras: '' };
    const salvo = planejamentosSalvos[diaRefeicao];

    const totalAlunos = Number(planejamento.alunos);
    const totalExtras = Number(planejamento.extras);
    const alunosDaMargem = Math.ceil(totalAlunos * MARGEM_SEGURANCA);
    const totalPlanejado = totalAlunos + alunosDaMargem + totalExtras;

    const podeSalvar =
        planejamento.alunos !== '' &&
        Number.isSafeInteger(totalAlunos) &&
        Number.isSafeInteger(totalExtras) &&
        Number.isSafeInteger(totalPlanejado);

    const estaSalvo =
        salvo?.alunos === planejamento.alunos &&
        salvo?.extras === planejamento.extras;

    function atualizarPlanejamento(campo: keyof Planejamento, texto: string) {
        const somenteDigitos = texto.replace(/[^0-9]/g, '');

        setRascunhos((anteriores) => ({
            ...anteriores,
            [diaRefeicao]: {
                ...(anteriores[diaRefeicao] ?? { alunos: '', extras: '' }),
                [campo]: somenteDigitos,
            },
        }));
    }

    function salvarPlanejamento() {
        if (!podeSalvar) return;

        setPlanejamentosSalvos((anteriores) => ({
            ...anteriores,
            [diaRefeicao]: planejamento,
        }));
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
                            options={mensal ? MESES : DIAS}
                            value={mensal ? mes : dia}
                            onChange={mensal ? setMes : setDia}
                        />

                        <Card style={styles.relatorio}>
                            <Logo style={styles.marca} />

                            <Text accessibilityRole="header" style={styles.tituloRelatorio}>
                                Resumo do atendimento escolar
                            </Text>

                            <Text style={styles.info}>
                                Escola Municipal Novo Horizonte · {relatorio.periodo}
                            </Text>

                            <View style={styles.indicadores}>
                                <View style={styles.indicador}>
                                    <Kpicard title="Total de alunos registrados" value={relatorio.alunos} />
                                </View>

                                <View style={styles.indicador}>
                                    <Kpicard title="Refeições servidas" value={relatorio.previsao} />
                                </View>
                            </View>

                            <Text accessibilityRole="header" style={styles.subtitulo}>
                                Quantidade de alunos
                            </Text>

                            <BarList
                                itens={[
                                    { nome: 'Alunos', valor: relatorio.alunos },
                                    { nome: 'Pratos', valor: relatorio.previsao },
                                ]}
                                unidade=""
                            />
                            {mensal && variacao !== null && (
                                <Text style={styles.comparacao}>
                                    {simbolo} Em relação a {REFERENCIA_DEMO.periodo}: {textoComparacao}
                                </Text>
                            )}

                            <Text accessibilityRole="header" style={styles.subtitulo}>
                                Pontos de Atenção
                            </Text>

                            <Text style={styles.info}>
                                A previsão inclui a margem de segurança sobre a presença registrada.
                            </Text>

                            <Text style={styles.info}>
                                Dados de demonstração · {registros.length}{' '}
                                {registros.length === 1 ? 'dia registrado' : 'dias registrados'}
                            </Text>
                        </Card>
                    </>

                ) : (
                    <View style={styles.diario}>
                        <Text style={styles.rotuloDiario}>Data e refeição</Text>

                        <Select
                            variant="relatorio"
                            label="Data e refeição"
                            options={OPCOES_DIARIAS}
                            value={diaRefeicao}
                            onChange={setDiaRefeicao}
                        />

                        <Text style={styles.rotuloDiario}>Total de alunos registrados</Text>

                        <Input
                            accessibilityLabel="Total de alunos registrados"
                            inputMode="numeric"
                            placeholder="Informe o total"
                            placeholderTextColor="#E6F2DA"
                            value={planejamento.alunos}
                            onChangeText={(texto) => atualizarPlanejamento('alunos', texto)}
                            style={styles.inputDiario}
                        />

                        <Text style={styles.ajudaDiario}>
                            Informe apenas o total. Sem nomes de alunos.
                        </Text>

                        <Card style={styles.cardMargem}>
                            <Text style={styles.tituloMargem}>Margem de segurança: 10%</Text>
                            <Text style={styles.ajudaDiario}>
                                Configuração do MVP · +{alunosDaMargem} alunos
                            </Text>
                        </Card>

                        <Text style={styles.rotuloDiario}>Ajuste para evento (opcional)</Text>

                        <Input //adicionar uma condicional para limitar as unidades inseridas
                            accessibilityLabel="Alunos extras para evento"
                            inputMode="numeric"
                            placeholder="Adicionar alunos extras"
                            placeholderTextColor="#315F52"
                            value={planejamento.extras}
                            onChangeText={(texto) => atualizarPlanejamento('extras', texto)}
                            style={styles.inputExtras}
                        />

                        <View style={styles.totalDiario}>
                            <Text style={styles.totalLegenda}>Preparo planejado para</Text>
                            <Text style={styles.totalValor}>
                                {podeSalvar ? `${totalPlanejado.toLocaleString('pt-BR')} alunos` : '—'}
                            </Text>
                        </View>

                        <Button
                            label="Salvar planejamento"
                            accessibilityRole="button"
                            disabled={!podeSalvar}
                            onPress={salvarPlanejamento}
                            style={[styles.salvarDiario, !podeSalvar && styles.desabilitado]}
                        />

                        {estaSalvo && (
                            <Text accessibilityLiveRegion="polite" style={styles.ajudaDiario}>
                                Planejamento salvo nesta sessão.
                            </Text>
                        )}
                    </View>
                )}
            </ScrollView>
            {mensal &&(
            <View style={styles.acoes}>
                <Button
                    label="Compartilhar"
                    accessibilityRole="button"
                    disabled={!onCompartilhar}
                    onPress={() => onCompartilhar?.(relatorio)}
                    style={[
                        styles.botao,
                        styles.botaoSecundario,
                        !onCompartilhar && styles.desabilitado,
                    ]}
                    textStyle={styles.textoSecundario}
                />

                <Button
                    label="Baixar PDF"
                    accessibilityRole="button"
                    disabled={!onBaixarPdf}
                    onPress={() => onBaixarPdf?.(relatorio)}
                    style={[styles.botao, !onBaixarPdf && styles.desabilitado]}
                />
            </View>
            )}
        </View>
    );
}