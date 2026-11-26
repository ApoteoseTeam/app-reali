import { useEffect, useState } from 'react';
import { Alert, Modal } from 'react-native';
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

type Screen = 'home' | 'perfil' | 'cardapio' | 'relatorio' | 'historico' | 'assistente';

function SignedIn() {
  const [screen, setScreen] = useState<Screen>('home');
  const [showContext, setShowContext] = useState(false);
  const assistant = () => setScreen('assistente');
  const { me, workspace, selecting } = useSession();
  const scope = workspace?.scope;
  const school = workspace?.school;
  const today = localDate();
  const query = { school: school?.id, date: today };
  const dashboard = useRemote('dashboard/' + today, signal => api.dashboard(scope!, query, signal),
    Boolean(scope && school && screen === 'home'), 60000);
  const days = weekDays(today);
  const menu = useRemote('menu/' + days[0], signal => api.all(
    () => api.mealMetrics(scope!, { school: school?.id, start_date: days[0], end_date: days[6] }, signal),
    { scope, signal }), Boolean(scope && school && screen === 'cardapio'));
  const error = dashboard.error?.message ?? menu.error?.message;

  useEffect(() => {
    if (error) Alert.alert('Não foi possível carregar os dados', error);
  }, [error]);

  const home = () => setScreen('home');
  const profile = () => setScreen('perfil');
  const cardapio = () => setScreen('cardapio');
  const report = () => setScreen('relatorio');

  const history = () => setScreen('historico');
  const isCook = workspace?.member.role === 'COOK';

  if (screen === 'assistente') {
    return <TelaAssistente onVoltar={home} />;
  }
  if (screen === 'perfil') {
    const closeContext = () => { if (!selecting) setShowContext(false); };
    return <>
      <PerfilUsuario onVoltar={home} onSelecionarContexto={() => setShowContext(true)} />
      {showContext && <Modal visible animationType="slide" onRequestClose={closeContext}>
        <SelecionarContexto onCancel={closeContext} onComplete={() => setShowContext(false)} />
      </Modal>}
    </>;
  }
  if (screen === 'cardapio') {
    const menuProps = {
      periodo: `${dateLabel(days[0])} a ${dateLabel(days[6])}`,
      dias: days.map(day => {
        const meals = menu.data?.filter(item => item.reference_date === day) ?? [];
        return {
          dia: dateLabel(day),
          refeicoes: meals.map(item => ({ nome: mealTypes[item.meal_type], preparacoes: [] })),
          planejamento: meals.length === 1 ? meals[0].total_forecast_plates ?? undefined : undefined,
        };
      }),
      onInicioPress: home,
    };
    return isCook ? <Cardapio {...menuProps} onPerfilPress={profile} />
      : <CardapioGestao {...menuProps} onRelatoriosPress={report} onHistoricoPress={history} />;
  }
  if (screen === 'historico') {
    return <Historico onInicioPress={home} onRelatoriosPress={report} onCardapioPress={cardapio} />;
  }
  if (screen === 'relatorio') {
    return <Relatorio
      onInicioPress={home} onRelatoriosPress={report} onCardapioPress={cardapio} onHistoricoPress={history} />;
  }
  const data = dashboard.data;
  const meal = data?.meal_services[0];
  const name = me?.user.full_name || me?.user.email || '—';
  if (isCook) {
    return <HomeCozinha nome={name} dataTurno={dateLabel(data?.reference_date ?? today)}
      presentes={data?.total_student_entries} totalPlanejado={data?.total_forecast_plates}
      onPerfilPress={profile} onCardapioPress={cardapio} />;
  }
  return <Home onAssistentePress={assistant} profilePhoto={me?.user.profile_photo} onPerfilPress={profile}
    onCardapioPress={cardapio} onRelatoriosPress={report}
    onHistoricoPress={history} resumo={{
      nome: name, escola: school?.name ?? '—', data: dateLabel(data?.reference_date ?? today),
      alunos: data?.total_student_entries ?? null, refeicoesServidas: data?.total_served_plates ?? null,
      refeicao: meal ? mealTypes[meal.meal_type] : 'Sem refeição registrada',
      cardapio: meal?.total_forecast_plates == null ? 'Previsão indisponível' : `Previsão: ${meal.total_forecast_plates} pratos`,
      consumo: meal?.total_served_plates == null ? 'Sem contagem' : `${meal.total_served_plates} pratos servidos`,
      aviso: data?.calculated_at ? `Atualizado em ${new Date(data.calculated_at).toLocaleString('pt-BR')}` : 'Sem atualização registrada.',
    }} />;
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



