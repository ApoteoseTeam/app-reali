import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Modal, View, } from 'react-native';
import { api, SessionProvider, useSession } from './session/provider';
import { mealTypes } from './api/reali';
import { useRemote } from './hooks/useRemote';
import { dateLabel, localDate, weekDays } from './services/dates';
import TelaInicial from './screens/TelaInicial/TelaInicial';
import CardapioGestao from './screens/CardapioGestao/CardapioGestao';
import Login from './screens/loginCadastro/loginCadastro';
import Home from './screens/HomeGestao/Home';
import HomeCozinha from './screens/HomeCozinha/HomeCozinha';
import PerfilUsuario from './screens/PerfilUsuario/PerfilUsuario';
import Cardapio from './screens/CardapioCozinha/CardapioCozinha';
import Relatorio from './screens/Relatorio/Relatorio';
import TelaAssistente from './screens/TelaAssistente/TelaAssistente';
import Historico from './screens/Historico/Historico';
import SelecionarContexto from './screens/SelecionarContexto/SelecionarContexto';
import { BottomTabs } from './components/BottomTabs/BottomTabs';

type Screen = 'home' | 'perfil' | 'cardapio' | 'relatorio' | 'historico' | 'assistente';

function SignedIn() {
  const [requestedScreen, setScreen] = useState<Screen>('home');
  const [showContext, setShowContext] = useState(false);

  const { me, workspace, selecting, can } = useSession();

  // Permissões
  const canOpenMenu =
    can('manage_meals') ||
    can('prepare');

  const canOpenReports = can('analytics_reports');
  const canOpenHistory = can('meal_history');

  const allowed: Record<Screen, boolean> = {
    home: true,
    perfil: true,
    cardapio: canOpenMenu,
    historico: canOpenHistory,
    relatorio: canOpenReports,
    assistente: can('realinova_full') || can('realinova_limited'),
  };

  const screen = allowed[requestedScreen] ? requestedScreen : 'home';

  const open = (target: Screen) => allowed[target] ? () => setScreen(target) : undefined;

  const home = () => setScreen('home');
  const profile = () => setScreen('perfil');

  const cardapio = open('cardapio');
  const report = open('relatorio');
  const history = open('historico');
  const assistant = open('assistente');

  // Estado da aba ativa
  const activeTab =
    screen === 'perfil'
      ? 'perfil'
      : screen === 'cardapio'
        ? 'cardapios'
        : screen === 'relatorio'
          ? 'relatorios'
          : screen === 'historico'
            ? 'historico'
            : 'home';


  // Rodapé compartilhado
  const withTabs = (
    content: ReactNode,
  ) => (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {content}
      </View>

      <BottomTabs
        activeTab={activeTab}
        showRelatorios={canOpenReports}
        showHistorico={canOpenHistory}
        showPerfil
        showCardapios={canOpenMenu}
        onHomePress={home}
        onRelatoriosPress={report}
        onCardapiosPress={cardapio}
        onHistoricoPress={history}
        onPerfilPress={profile}
      />
    </View>
  );

  const showIndicators = can('indicators');
  const showForecast = can('forecast');
  const kitchenLayout = can('prepare') && !can('manage_meals');
  const scope = workspace?.scope;
  const school = workspace?.school;

  const today = localDate();
  const query = { school: school?.id, date: today };

  const dashboard = useRemote('dashboard/' + today, signal => api.dashboard(scope!, query, signal),
    Boolean(scope && school && showIndicators && screen === 'home'), 60000);

  const days = weekDays(today);
  const end = days[6] > today ? today : days[6];

  const menu = useRemote(`menu/${days[0]}/${end}`, signal => api.all(
    () => api.mealMetrics(scope!, { school: school?.id, start_date: days[0], end_date: end }, signal),
    { scope, signal }), Boolean(scope && school && screen === 'cardapio'));
  const error = dashboard.error?.message ?? menu.error?.message;

  useEffect(() => {
    if (error) Alert.alert('Não foi possível carregar os dados', error);
  }, [error]);
  if (screen === 'assistente') {
    return <TelaAssistente onVoltar={home} />;
  }
  if (screen === 'perfil') {
    const closeContext = () => {
      if (!selecting) setShowContext(false);
    };

    return withTabs(
      <>
        <PerfilUsuario
          onVoltar={home}
          onSelecionarContexto={() => setShowContext(true)}
        />

        {showContext && (
          <Modal
            visible
            animationType="slide"
            onRequestClose={closeContext}
          >
            <SelecionarContexto
              onCancel={closeContext}
              onComplete={() => setShowContext(false)}
            />
          </Modal>
        )}
      </>,
    );
  }

  if (screen === 'cardapio') {
    const menuProps = {
      periodo: `${dateLabel(days[0])} a ${dateLabel(days[6])}`,

      dias: days.map(day => {
        const meals =
          menu.data?.filter(
            item => item.reference_date === day,
          ) ?? [];

        return {
          dia: dateLabel(day),

          refeicoes: meals.map(item => ({
            nome: mealTypes[item.meal_type],
            preparacoes: [],
          })),

          planejamento:
            showForecast && meals.length === 1
              ? meals[0].total_forecast_plates ?? undefined
              : undefined,
        };
      }),

      onInicioPress: home,
    };

    const menuScreen =
      kitchenLayout
        ? (
          <Cardapio
            {...menuProps}
            onPerfilPress={profile}
            onHistoricoPress={history}
          />
        )
        : (
          <CardapioGestao
            {...menuProps}
            onRelatoriosPress={report}
            onHistoricoPress={history}
          />
        );

    return withTabs(menuScreen);
  }

  if (screen === 'historico') {
    return withTabs(
      <Historico
        onInicioPress={home}
        onRelatoriosPress={report}
        onCardapioPress={cardapio}
      />,
    );
  }

  if (screen === 'relatorio') {
    return withTabs(
      <Relatorio
        onInicioPress={home}
        onRelatoriosPress={report}
        onCardapioPress={cardapio}
        onHistoricoPress={history}
      />,
    );
  }

  const data = dashboard.data;
  const meal = data?.meal_services[0];
  const name = me?.user.full_name || me?.user.email || '—';

  if (kitchenLayout && showIndicators) {
    return withTabs(
      <HomeCozinha
        nome={name}
        dataTurno={dateLabel(data?.reference_date ?? today)}
        presentes={data?.total_student_entries}
        totalPlanejado={data?.total_forecast_plates}
        showForecast={showForecast}
        onPerfilPress={profile}
        onCardapioPress={cardapio}
        onHistoricoPress={history}
        onRelatoriosPress={report}
        onAssistentePress={assistant}
      />,
    );
  }

  return withTabs(
    <Home
      onAssistentePress={assistant}
      profilePhoto={me?.user.profile_photo}
      onPerfilPress={profile}
      showIndicators={showIndicators}
      onCardapioPress={cardapio}
      onRelatoriosPress={report}
      onHistoricoPress={history}
      resumo={{
        nome: name,
        escola: school?.name ?? '—',
        data: dateLabel(data?.reference_date ?? today),
        alunos: data?.total_student_entries ?? null,
        refeicoesServidas:
          data?.total_served_plates ?? null,
        refeicao: meal
          ? mealTypes[meal.meal_type]
          : 'Sem refeição registrada',
        cardapio: showForecast
          ? (
            meal?.total_forecast_plates == null
              ? 'Previsão indisponível'
              : `Previsão: ${meal.total_forecast_plates} pratos`
          )
          : undefined,
        consumo:
          meal?.total_served_plates == null
            ? 'Sem contagem'
            : `${meal.total_served_plates} pratos servidos`,
        aviso: data?.calculated_at
          ? `Atualizado em ${new Date(
            data.calculated_at,
          ).toLocaleString('pt-BR')}`
          : 'Sem atualização registrada.',
      }}
    />,
  );
}

function SessionScreen() {
  const { status, me, workspace, error } = useSession();
  const hasSchool = Boolean(workspace?.school);

  useEffect(() => {
    if (error && (status !== 'AUTHENTICATED' || hasSchool)) Alert.alert('Reali', error);
  }, [error, status, hasSchool]);

  if (status === 'AUTHENTICATED') {
    if (!workspace?.school) return <SelecionarContexto key={me?.user.id} />;
    return <SignedIn key={workspace.key} />;
  }
  return <SignedOut sessionExpired={status === 'SESSION_EXPIRED'} />;
}

function SignedOut({ sessionExpired }: { sessionExpired: boolean }) {
  const [showLogin, setShowLogin] = useState(false);
  if (showLogin || sessionExpired) return <Login />;
  return <TelaInicial onEntrar={() => setShowLogin(true)} />;
}

export default function App() {
  return <SessionProvider><SessionScreen /></SessionProvider>;
}