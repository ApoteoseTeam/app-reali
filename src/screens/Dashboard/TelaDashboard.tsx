import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  CalendarDays,
  CircleUser,
  ClipboardList,
  House,
  LayoutDashboard,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { Chart } from '../../components/Chart/Chart';
import { Header } from '../../components/header/header';
import { Kpicard } from '../../components/Kpicard/Kpicard'; 
import { colors } from '../../theme/colors';
import { styles } from './style';

// Dados fictícios de demonstração.
const PREPARACOES = [
  { label: 'Arroz', value: 4.2, color: '#64B55B' },
  { label: 'Feijão', value: 2.1, color: '#FFB627' },
  { label: 'Carne', value: 3.8, color: '#F97360' },
  { label: 'Salada', value: 1.3, color: '#8ABF4B' },
  { label: 'Fruta', value: 1.0, color: '#9B86CF' },
];

// Médias fictícias por dia da semana.
// A média do mês selecionado é 18% menor que a do anterior.
const COMPARATIVO = [
  {
    name: 'Este mês',
    color: colors.favorable,
    points: [
      { label: 'Seg', value: 0.82 },
      { label: 'Ter', value: 0.738 },
      { label: 'Qua', value: 0.902 },
      { label: 'Qui', value: 0.82 },
      { label: 'Sex', value: 0.984 },
    ],
  },
  {
    name: 'Mês anterior',
    color: '#87929C',
    points: [
      { label: 'Seg', value: 1.0 },
      { label: 'Ter', value: 0.9 },
      { label: 'Qua', value: 1.1 },
      { label: 'Qui', value: 1.0 },
      { label: 'Sex', value: 1.2 },
    ],
  },
];

const ABAS: {
  nome: string;
  icone: LucideIcon;
  ativa: boolean;
}[] = [
  { nome: 'Home', icone: House, ativa: false },
  { nome: 'Formulário', icone: ClipboardList, ativa: false },
  { nome: 'Dashboard', icone: LayoutDashboard, ativa: true },
  { nome: 'Perfil', icone: CircleUser, ativa: false },
];

export default function TelaDashboard() {
  const [larguraConteudo, setLarguraConteudo] = useState(0);

  const cardsEmpilhados = larguraConteudo < 340;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <Header name="Dashboard" />
      </View>

      <ScrollView
        style={styles.rolagem}
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.areaMedida}
          onLayout={({ nativeEvent }) => {
            setLarguraConteudo(nativeEvent.layout.width);
          }}
        >
          <View style={styles.periodo}>
            <CalendarDays size={20} color={colors.text} />
            <Text style={styles.periodoTexto}>
              Outubro de 2026
            </Text>
          </View>

          <Text style={styles.aviso}>
            Dados fictícios para demonstração
          </Text>

          <View
            style={[
              styles.indicadores,
              cardsEmpilhados && styles.indicadoresEmpilhados,
            ]}
          >
            <View style={styles.indicador}>
              <Kpicard
                title="Total de sobra"
                value={23.5}
                unit="kg"
                change={-18}
                lowerIsBetter
              />

              <Text style={styles.comparacao}>
                Em relação ao mês anterior
              </Text>
            </View>

            <View style={styles.indicador}>
              <Kpicard
                title="Refeições servidas"
                value={1280}
                change={6}
              />

              <Text style={styles.comparacao}>
                Em relação ao mês anterior
              </Text>
            </View>
          </View>

          <View style={styles.secao}>
            <Text style={styles.titulo}>
              Desperdício de preparação
            </Text>

            <Text style={styles.descricao}>
              Sobra por preparação no mês, em kg
            </Text>

            {larguraConteudo > 0 && (
              <View style={styles.grafico}>
                <Chart
                  variant="bar"
                  data={PREPARACOES}
                  width={larguraConteudo}
                  height={220}
                  unit=" kg"
                  accessibilityLabel={
                    'Desperdício por preparação em outubro de 2026. ' +
                    'Arroz: 4,2 kg; feijão: 2,1 kg; carne: 3,8 kg; ' +
                    'salada: 1,3 kg; fruta: 1 kg. Dados fictícios.'
                  }
                />
              </View>
            )}
          </View>

          <View style={styles.secao}>
            <Text style={styles.titulo}>
              Comparativo de desperdício
            </Text>

            <Text style={styles.descricao}>
              Média por dia da semana, em kg
            </Text>

            {larguraConteudo > 0 && (
              <View style={styles.grafico}>
                <Chart
                  variant="line"
                  series={COMPARATIVO}
                  width={larguraConteudo}
                  height={220}
                  unit=" kg"
                />
              </View>
            )}
          </View>

          <View style={styles.assistente}>
            <View style={styles.balao}>
              <Text style={styles.assistenteTitulo}>
                Olá! Sou sua assistente virtual.
              </Text>

              <Text style={styles.assistenteTexto}>
                Posso te ajudar com dúvidas sobre o sistema e os dados.
              </Text>
            </View>

            <View
              style={styles.assistenteIcone}
              accessible
              accessibilityLabel="Assistente virtual. Em breve."
            >
              <MessageCircle
                size={30}
                color={colors.background}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Menu provisório: a navegação será conectada depois. */}
      <View style={styles.menu}>
        {ABAS.map(({ nome, icone: Icone, ativa }) => (
          <View
            key={nome}
            style={styles.menuItem}
            accessible
            accessibilityLabel={
              ativa ? `${nome}, tela atual` : nome
            }
          >
            <Icone
              size={24}
              color={ativa ? colors.primary : colors.text}
              strokeWidth={ativa ? 2.8 : 2}
            />

            <Text
              style={[
                styles.menuTexto,
                ativa && styles.menuTextoAtivo,
              ]}
            >
              {nome}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}