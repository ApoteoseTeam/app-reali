import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { api, SessionProvider, useSession } from './session/provider';
import { mealTypes } from './api/reali';
import { useRemote } from './hooks/useRemote';
import { dateLabel, localDate, monthRange, weekDays } from './services/dates';
import TelaInicial from './screens/TelaInicial/TelaInicial';
import CardapioGestao from './screens/CardapioGestao/CardapioGestao';
import Login from './screens/loginCadastro/loginCadastro';
import Home from './screens/HomeGestao/Home';
import HomeCozinha from './screens/HomeCozinha/HomeCozinha';
import PerfilUsuario from './screens/PerfilUsuario/PerfilUsuario';
import Cardapio from './screens/CardapioCozinha/CardapioCozinha';
import Relatorio from './screens/Relatorio/Relatorio';

type Screen = 'home' | 'perfil' | 'cardapio' | 'relatorio' | 'historico';

function SignedIn() {
  const [screen, setScreen] = useState<Screen>('home');
  const { me, workspace } = useSession();
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

  if (screen === 'perfil') return <PerfilUsuario onVoltar={home} />;
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
  if (screen === 'relatorio' || screen === 'historico') {
    return <Relatorio key={screen} initialMode={screen === 'historico' ? 'Diário' : 'Mensal'}
      onInicioPress={home} onRelatoriosPress={report} onCardapioPress={cardapio} onHistoricoPress={history}
      onBaixarPdf={Platform.OS === 'web' && scope && school ? async ({ month }, { signal }) => {
        const pdf = await api.report(scope, { ...monthRange(month), school: school.id, group: 'monthly' }, 'pdf', signal);
        const nome = `reali-${month}.pdf`;
        return { nome, abrir: async () => {
          if (signal.aborted || scope.signal?.aborted) throw new Error('Exportação cancelada.');
          const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = nome;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } };
      } : undefined} />;
  }
  const data = dashboard.data;
  const meal = data?.meal_services[0];
  const name = me?.user.full_name || me?.user.email || '—';
  if (isCook) {
    return <HomeCozinha nome={name} dataTurno={dateLabel(data?.reference_date ?? today)}
      presentes={data?.total_student_entries} totalPlanejado={data?.total_forecast_plates}
      onPerfilPress={profile} onCardapioPress={cardapio} />;
  }
  return <Home onPerfilPress={profile} onCardapioPress={cardapio} onRelatoriosPress={report}
    onHistoricoPress={history} resumo={{
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
  const [entry, setEntry] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (status === 'AUTHENTICATED') setEntry(null);
  }, [status]);

  useEffect(() => {
    if (error) Alert.alert('Reali', error);
  }, [error]);

  if (status === 'AUTHENTICATED') return <SignedIn key={workspace?.key ?? me?.user.id} />;
  if (entry !== null || status === 'SESSION_EXPIRED') return <Login abaInicial={entry ?? 0} />;
  return <TelaInicial onEntrar={() => setEntry(0)} onCadastro={() => setEntry(1)} />;
}

export default function App() {
  return <SessionProvider><SessionScreen /></SessionProvider>;
}



