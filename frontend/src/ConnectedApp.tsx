import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api, SessionProvider, useSession } from './session/provider';
import { mealTypes } from './api/reali';
import { useRemote } from './hooks/useRemote';
import { dateLabel, localDate } from './services/dates';
import Login from './screens/loginCadastro/loginCadastro';
import Home from './screens/HomeGestao/Home';
import HomeCozinha from './screens/HomeCozinha/HomeCozinha';
import PerfilUsuario from './screens/PerfilUsuario/PerfilUsuario';
import Cardapio from './screens/CardapioCozinha/CardapioCozinha';
import Relatorio from './screens/Relatorio/Relatorio';

type Screen = 'home' | 'perfil' | 'cardapio' | 'relatorio';

function SignedIn() {
  const [screen, setScreen] = useState<Screen>('home');
  const { me, workspace } = useSession();
  const scope = workspace?.scope;
  const school = workspace?.school;
  const today = localDate();
  const query = { school: school?.id, date: today };
  const dashboard = useRemote('dashboard/' + today, signal => api.dashboard(scope!, query, signal),
    Boolean(scope && school && screen === 'home'), 60000);
  const error = dashboard.error?.message;

  useEffect(() => {
    if (error) Alert.alert('Não foi possível carregar os dados', error);
  }, [error]);

  const home = () => setScreen('home');
  const profile = () => setScreen('perfil');
  const cardapio = () => setScreen('cardapio');
  const report = () => setScreen('relatorio');

  if (screen === 'perfil') {
    return <PerfilUsuario />;
  }
  if (screen === 'cardapio') {
    return <Cardapio onInicioPress={home} onPerfilPress={profile} />;
  }
  if (screen === 'relatorio') {
    return <Relatorio onRelatoriosPress={report} onCardapioPress={cardapio} onHistoricoPress={report} />;
  }
  const data = dashboard.data;
  const meal = data?.meal_services[0];
  const name = me?.user.full_name || me?.user.email || '—';
  if (workspace?.member.role === 'COOK') {
    return <HomeCozinha nome={name} dataTurno={dateLabel(data?.reference_date ?? today)}
      presentes={data?.total_student_entries} totalPlanejado={data?.total_forecast_plates}
      onPerfilPress={profile} onCardapioPress={cardapio} />;
  }
  return <Home onPerfilPress={profile} onCardapioPress={cardapio} onRelatoriosPress={report}
    onHistoricoPress={report} resumo={{
      nome: name, escola: school?.name ?? '—', data: dateLabel(data?.reference_date ?? today),
      alunos: data?.total_student_entries ?? null, refeicoesServidas: data?.total_served_plates ?? null,
      refeicao: meal ? mealTypes[meal.meal_type] : 'Sem refeição registrada',
      cardapio: meal?.total_forecast_plates == null ? 'Previsão indisponível' : `Previsão: ${meal.total_forecast_plates} pratos`,
      consumo: meal?.total_served_plates == null ? 'Sem contagem' : `${meal.total_served_plates} pratos servidos`,
      aviso: !school ? 'Nenhuma escola selecionada. A seleção manual não está disponível nesta interface.'
        : data?.calculated_at ? `Atualizado em ${new Date(data.calculated_at).toLocaleString('pt-BR')}` : 'Sem atualização registrada.',
    }} />;
}

function SessionScreen() {
  const { status, me, workspace, error } = useSession();

  useEffect(() => {
    if (error) Alert.alert('Reali', error);
  }, [error]);

  if (status === 'AUTHENTICATED') return <SignedIn key={workspace?.key ?? me?.user.id} />;
  return <Login />;
}

export default function App() {
  return <SessionProvider><SessionScreen /></SessionProvider>;
}



