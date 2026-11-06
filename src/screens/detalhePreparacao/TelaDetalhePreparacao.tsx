import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';

import { Header } from '../../components/Header/header';
import {SegmentedControl} from '../../components/SegmentedControl/SegmentedControl';
import { Kpicard } from '../../components/Kpicard/Kpicard';
import { Chart } from '../../components/Chart/Chart';
import { BarList } from '../../components/BarList/BarList';
import { Button } from '../../components/button';

import { colors } from '../../theme/colors';
import { styles } from './style';

type Periodo = 'Semana' | 'Mês';

export type DadosPeriodo = {
  produzidoKg: number;
  sobraAnteriorKg: number;
  pontos: {
    label: string;
    value: number;
    accessibilityLabel?: string;
  }[];
  refeicoes: {
    nome: string;
    valor: number;
  }[];
  hipoteses: string[];
};

export type Preparacao = {
  nome: string;
  dados: Record<Periodo, DadosPeriodo>;
};

type TelaDetalhePreparacaoProps = {
  preparacao?: Preparacao;
  onVoltar?: () => void;
  onVerRegistros?: () => void;
};

const ARROZ_EXEMPLO: Preparacao = {
  nome: 'Arroz',
  dados: {
    Semana: {
      produzidoKg: 35,

      // 4,2 kg representam um aumento de 8%.
      sobraAnteriorKg: 4.2 / 1.08,

      pontos: [
        {
          label: 'Seg',
          value: 0.8,
          accessibilityLabel: 'Segunda-feira',
        },
        {
          label: 'Ter',
          value: 0.7,
          accessibilityLabel: 'Terça-feira',
        },
        {
          label: 'Qua',
          value: 1.1,
          accessibilityLabel: 'Quarta-feira',
        },
        {
          label: 'Qui',
          value: 0.9,
          accessibilityLabel: 'Quinta-feira',
        },
        {
          label: 'Sex',
          value: 0.7,
          accessibilityLabel: 'Sexta-feira',
        },
      ],

      refeicoes: [
        { nome: 'Almoço', valor: 3.1 },
        { nome: 'Lanche', valor: 1.1 },
      ],

      hipoteses: [
        'Há sobra no lanche. Vale conferir a porção servida.',
        'Quarta teve o maior valor da semana. Vale verificar o que foi servido junto.',
      ],
    },

    Mês: {
      produzidoKg: 150,
      sobraAnteriorKg: 20,

      pontos: [
        { label: 'Sem. 1', value: 4.2 },
        { label: 'Sem. 2', value: 4.8 },
        { label: 'Sem. 3', value: 3.6 },
        { label: 'Sem. 4', value: 5.4 },
      ],

      refeicoes: [
        { nome: 'Almoço', valor: 13.5 },
        { nome: 'Lanche', valor: 4.5 },
      ],

      hipoteses: [
        'A semana 4 concentrou a maior sobra. Vale comparar a produção com a quantidade de refeições servidas.',
        'O almoço concentrou a maior parte da sobra. Vale revisar o planejamento das porções.',
      ],
    },
  },
};

const OPCOES = ['Semana', 'Mês'];

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

export default function TelaDetalhePreparacao({
  preparacao = ARROZ_EXEMPLO,
  onVoltar,
  onVerRegistros,
}: TelaDetalhePreparacaoProps) {
  const [periodo, setPeriodo] = useState<Periodo>('Semana');
  const [larguraGrafico, setLarguraGrafico] = useState(0);

  const dados = preparacao.dados[periodo];

  const sobraKg = arredondar(
    dados.pontos.reduce((total, ponto) => total + ponto.value, 0)
  );

  const percentualSobra =
    dados.produzidoKg > 0
      ? arredondar((sobraKg / dados.produzidoKg) * 100)
      : undefined;

  const variacao =
    dados.sobraAnteriorKg > 0
      ? arredondar(
          ((sobraKg - dados.sobraAnteriorKg) /
            dados.sobraAnteriorKg) *
            100
        )
      : undefined;

  const periodoAnterior =
    periodo === 'Semana' ? 'semana anterior' : 'mês anterior';

  function selecionarPeriodo(opcao: string) {
    if (opcao === 'Semana' || opcao === 'Mês') {
      setPeriodo(opcao);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <Header
          name={preparacao.nome}
          variant="back"
          onBack={onVoltar}
        />
      </View>

      <ScrollView
        style={styles.rolagem}
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          opcoes={OPCOES}
          selecionado={periodo}
          aoSelecionar={selecionarPeriodo}
        />

        <View style={styles.indicadores}>
          <View style={styles.indicador}>
            <Kpicard
              title="Sobra"
              value={sobraKg}
              unit="kg"
            />
          </View>

          <View style={styles.indicador}>
            {percentualSobra !== undefined ? (
              <Kpicard
                title="% de sobra"
                value={percentualSobra}
                unit="%"
              />
            ) : (
              <Text style={styles.texto}>
                Percentual indisponível: produção não informada.
              </Text>
            )}
          </View>

          <View style={styles.indicador}>
            {variacao !== undefined ? (
              <Kpicard
                title={`vs. ${periodoAnterior}`}
                value={Math.abs(variacao)}
                unit="%"
                change={variacao}
                lowerIsBetter
              />
            ) : (
              <Text style={styles.texto}>
                Sem base para comparar com o período anterior.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.secao}>
          <Text accessibilityRole="header" style={styles.titulo}>
            {periodo === 'Semana'
              ? 'Sobra por dia (kg)'
              : 'Sobra por semana (kg)'}
          </Text>

          <View
            style={styles.grafico}
            onLayout={({ nativeEvent }) => {
              setLarguraGrafico(nativeEvent.layout.width);
            }}
          >
            {larguraGrafico > 0 && (
              <Chart
                variant="line"
                data={dados.pontos}
                width={larguraGrafico}
                height={210}
                color={colors.primary}
                unit=" kg"
              />
            )}
          </View>
        </View>

        <View style={styles.secao}>
          <Text accessibilityRole="header" style={styles.titulo}>
            Sobra por refeição
          </Text>

          <BarList
            itens={dados.refeicoes}
            unidade="kg"
          />
        </View>

        <View style={styles.hipoteses}>
          <Text accessibilityRole="header" style={styles.titulo}>
            Hipóteses
          </Text>

          {dados.hipoteses.map((hipotese) => (
            <Text key={hipotese} style={styles.texto}>
              • {hipotese}
            </Text>
          ))}

          <Text style={styles.nota}>
            Para conversar com a equipe, não são conclusões.
          </Text>
        </View>

        <Button
          label="Ver registros desta preparação"
          onPress={onVerRegistros}
          disabled={!onVerRegistros}
          accessibilityLabel={
            onVerRegistros
              ? 'Ver registros desta preparação'
              : 'Ver registros desta preparação. Indisponível nesta demonstração.'
          }
          accessibilityState={{
            disabled: !onVerRegistros,
          }}
          style={styles.botao}
          textStyle={styles.botaoTexto}
        />

        <Text style={styles.aviso}>
          Valores ilustrativos para demonstração.
        </Text>
      </ScrollView>
    </View>
  );
}