import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import type { School } from '../../api/reali';
import { Button } from '../../components/Button/Button';
import { Header } from '../../components/header/header';
import { api, useSession } from '../../session/provider';
import { colors } from '../../theme/colors';
import { styles } from './styles';

type Props = {
  onCancel?: () => void;
  onComplete?: () => void;
};

type SchoolResult = {
  key: string;
  schools: School[];
  error?: string;
};

export default function SelecionarContexto({ onCancel, onComplete }: Props) {
  const { organizations, workspace, select, selecting, signOut, revalidate, error: sessionError } = useSession();
  const [organizationId, setOrganization] = useState(workspace?.organization.id);
  const [schoolId, setSchool] = useState(workspace?.school?.id);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SchoolResult>();
  const [submitError, setSubmitError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const submitting = useRef(false);

  const organization = organizations.find(item => item.id === organizationId)
    ?? (organizations.length === 1 ? organizations[0] : undefined);
  const activeOrganizationId = organization?.id;
  const requestKey = `${activeOrganizationId ?? ''}/${attempt}`;
  const currentResult = result?.key === requestKey ? result : undefined;
  const schools = currentResult?.schools ?? [];
  const school = schools.find(item => item.id === schoolId) ?? (schools.length === 1 ? schools[0] : undefined);
  const busy = selecting || refreshing;

  useEffect(() => {
    if (!activeOrganizationId) return;
    const controller = new AbortController();
    void api.schools({ organization: activeOrganizationId, signal: controller.signal })
      .then(items => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, schools: items.filter(item => item.is_active) });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            schools: [],
            error: error instanceof Error ? error.message : 'Não foi possível carregar as escolas.',
          });
        }
      });
    return () => controller.abort();
  }, [activeOrganizationId, requestKey]);

  function chooseOrganization(id: string) {
    if (activeOrganizationId === id) return;
    setOrganization(id);
    setSchool(undefined);
    setSubmitError('');
  }

  async function refreshAccess() {
    if (busy || submitting.current) return;
    setRefreshing(true);
    setSubmitError('');
    try {
      await revalidate();
      setAttempt(value => value + 1);
    } finally {
      setRefreshing(false);
    }
  }

  async function confirm() {
    if (busy || submitting.current || !organization || !school) return;
    setSubmitError('');
    submitting.current = true;
    try {
      await select(organization.id, school.id);
      onComplete?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível confirmar a seleção.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <View style={styles.screen}>
      <Header name="Organização e escola" right={null} titleStyle={styles.headerTitle} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!organizations.length && (
          <View style={styles.section} accessibilityRole="radiogroup" accessibilityLabel="Organização">
            <Text accessibilityRole="header" style={styles.label}>Organização</Text>
            {organizations.map(item => (
              <Option key={item.id} label={item.name} selected={item.id === activeOrganizationId}
                disabled={busy} onPress={() => chooseOrganization(item.id)} />
            ))}
          </View>
        )}

        {!organizations.length && (
          <Text style={styles.message}>Sua conta não tem acesso a uma organização ativa. Solicite acesso ao responsável pela sua instituição.</Text>
        )}

        {organization && (
          <View style={styles.section} accessibilityRole="radiogroup" accessibilityLabel="Escola">
            <Text accessibilityRole="header" style={styles.label}>Escola</Text>
            {!currentResult && <ActivityIndicator accessibilityLabel="Carregando escolas" color={colors.secondary} />}
            {currentResult?.error && <Text accessibilityRole="alert" style={styles.message}>{currentResult.error}</Text>}
            {currentResult && !currentResult.error && !schools.length && (
              <Text style={styles.message}>Nenhuma escola ativa disponível nesta organização.</Text>
            )}
            {schools.map(item => (
              <Option key={item.id} label={item.name} detail={item.code} selected={item.id === school?.id}
                disabled={busy} onPress={() => { setSchool(item.id); setSubmitError(''); }} />
            ))}
          </View>
        )}

        {(submitError || sessionError) && (
          <Text accessibilityRole="alert" style={styles.message}>{submitError || sessionError}</Text>
        )}

        <View style={styles.actions}>
          <Button label={selecting ? 'Confirmando…' : 'Acessar escola'} onPress={() => void confirm()}
            disabled={busy || !school}
            style={[styles.confirm, (busy || !school) && styles.disabled]} />
          {(refreshing || !organizations.length || (currentResult && (!schools.length || !!submitError)) || sessionError) && (
            <Button label={refreshing ? 'Atualizando…' : 'Atualizar acessos'} onPress={() => void refreshAccess()}
              disabled={busy} style={styles.secondary} textStyle={styles.secondaryText} />
          )}
          <Button label={onCancel ? 'Cancelar' : 'Sair da conta'} onPress={onCancel ?? (() => void signOut())}
            disabled={busy} style={styles.secondary} textStyle={styles.secondaryText} />
        </View>
      </ScrollView>
    </View>
  );
}

function Option({ label, detail, selected, disabled, onPress }: {
  label: string; detail?: string; selected: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={detail ? `${label}, código ${detail}` : label} disabled={disabled} onPress={onPress}
      style={[styles.option, selected && styles.selected]}>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      {selected && <Check size={20} color={colors.secondary} />}
    </Pressable>
  );
}
