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

export default function Relatorio({
    onCompartilhar,
    onBaixarPdf,
}: FormularioResumoProps = {}) {
    const [modo, setModo] = useState('Mensal');
    const [mes, setMes] = useState(MESES[0]);
    const [dia, setDia] = useState(DIAS[0]);

    const mensal = modo === 'Mensal';

    const registros = mensal
        ? REGISTROS_DEMO.filter((registro) =>
            registro.data.startsWith('2026-11')
        )
        : REGISTROS_DEMO.filter(
            (registro) => registro.data.split('-').reverse().join('/') === dia
        );

    const relatorio: DadosRelatorio = {
        periodo: mensal ? mes : dia,
        alunos: registros.reduce((total, registro) => total + registro.alunos, 0),
        previsao: registros.reduce(
            (total, registro) => total + registro.previsao,
            0
        ),
    };

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
                            <Kpicard title="Alunos registrados" value={relatorio.alunos} />
                        </View>

                        <View style={styles.indicador}>
                            <Kpicard title="Atendimento previsto" value={relatorio.previsao} />
                        </View>
                    </View>

                    <Text accessibilityRole="header" style={styles.subtitulo}>
                        Quantidade de alunos
                    </Text>

                    <BarList
                        itens={[
                            { nome: 'Presentes', valor: relatorio.alunos },
                            { nome: 'Previstos', valor: relatorio.previsao },
                        ]}
                        unidade=""
                    />

                    <Text accessibilityRole="header" style={styles.subtitulo}>
                        Sobre os dados
                    </Text>

                    <Text style={styles.info}>
                        A previsão inclui a margem de segurança sobre a presença registrada.
                    </Text>

                    <Text style={styles.info}>
                        Dados de demonstração · {registros.length}{' '}
                        {registros.length === 1 ? 'dia registrado' : 'dias registrados'}
                    </Text>
                </Card>
            </ScrollView>

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
        </View>
    );
}