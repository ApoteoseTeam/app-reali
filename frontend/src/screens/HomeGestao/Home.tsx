import { useRouter } from "expo-router";
import { ArrowLeftRight, ChevronRight, MessageCircle, UserRound } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mealStatuses, mealTypes, type Dashboard } from "../../api/reali";
import { BottomTabs } from "../../components/BottomTabs/BottomTabs";
import { IconButton } from "../../components/IconButton/IconButton";
import { Kpicard } from "../../components/KpiCard/KpiCard";
import { Logo } from "../../components/Logo/Logo";
import { NotificationBell } from "../../components/NotificationBell/NotificationBell";
import { Action, Feedback, labels, stamp, ui, value } from "../../features/ui";
import { styles } from "./styles";

type HomeProps = {
  name: string;
  school: string;
  data?: Dashboard;
  loading: boolean;
  error?: Error | null;
  refresh: () => void;
  can: (permission: string) => boolean;
};

export default function Home({ name, school, data, loading, error, refresh, can }: HomeProps) {
  const router = useRouter();
  const seesMeals = can("meal_history");
  const hasAssistant = can("realinova_full") || can("realinova_limited");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.tela}>
      <View style={styles.cabecalho}>
        <Logo variant="mark" style={styles.logo} />
        <View style={styles.headerActions}>
          <NotificationBell color="#FFFFFF" />
          <IconButton icon={UserRound} size={19} color="#FFFFFF" accessibilityLabel="Abrir perfil"
            onPress={() => router.push("/perfil")} style={styles.perfil} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
        <View style={styles.saudacao}>
          <Text accessibilityRole="header" style={styles.titulo}>Olá, {name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Trocar organização ou escola"
            style={styles.escola} onPress={() => router.push("/contexto")}>
            <Text style={styles.textoSecundario}>{school}</Text>
            <ArrowLeftRight size={16} color="#315F52" />
          </Pressable>
        </View>

        <Feedback loading={loading && !data} error={error} retry={refresh}
          empty={data?.data_status === "NO_DATA"} />

        {data && (
          <>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.secao}>Indicadores do dia</Text>
              <Text style={styles.textoSecundario}>{data.reference_date.split("-").reverse().join("/")}</Text>
            </View>
            <View style={styles.destaques}>
              <Kpicard title="Entradas registradas" value={data.total_student_entries} variant="gestao" />
              {can("forecast") &&
                <Kpicard title="Pratos previstos" value={data.total_forecast_plates} variant="gestao" />}
            </View>
            {seesMeals && (
              <View style={styles.resumo}>
                <View style={styles.dado}>
                  <Text style={styles.textoSecundario}>Pratos servidos</Text>
                  <Text style={styles.valor}>{value(data.total_served_plates)}</Text>
                </View>
                <View style={styles.dado}>
                  <Text style={styles.textoSecundario}>Desvio da previsão</Text>
                  <Text style={styles.valor}>{value(data.forecast_difference)}</Text>
                </View>
              </View>
            )}
            <Text style={styles.textoSecundario}>
              {labels(data.data_status)}{data.calculated_at ? ` · Atualizado em ${stamp(data.calculated_at)}` : ""}
            </Text>
            {(data.stale || data.data_status === "PROVISIONAL") && (
              <View style={styles.aviso}>
                <Text style={styles.textoAviso}>Dados provisórios ou pendentes de atualização.</Text>
              </View>
            )}

            {seesMeals && data.meal_services?.length > 0 && (
              <View style={styles.destaques}>
                <Text accessibilityRole="header" style={styles.secao}>Serviços do dia</Text>
                {data.meal_services.map(item => (
                  <Pressable key={item.id} accessibilityRole="button"
                    accessibilityLabel={`Abrir serviço de ${mealTypes[item.meal_type]}`} style={styles.refeicao}
                    onPress={() => router.push({ pathname: "/servico", params: { id: item.id } })}>
                    <View style={styles.dado}>
                      <Text style={styles.tituloRefeicao}>{mealTypes[item.meal_type]} · {mealStatuses[item.status]}</Text>
                      <Text style={styles.textoSecundario}>
                        Previstos {value(item.total_forecast_plates)} · Servidos {value(item.total_served_plates)}
                      </Text>
                    </View>
                    <ChevronRight size={19} color="#315F52" />
                  </Pressable>
                ))}
                {data.meal_services_truncated && <Text style={styles.textoSecundario}>A lista completa está em Merenda.</Text>}
              </View>
            )}
          </>
        )}

        <View style={ui.row}>
          {can("raw_counts") && <Action title="Contagens" variant="flat" onPress={() => router.push("/contagens")} />}
          {can("camera_status") && <Action title="Câmeras" variant="flat" onPress={() => router.push("/cameras")} />}
          {can("staff") && <Action title="Funcionários" variant="flat" onPress={() => router.push("/funcionarios")} />}
        </View>
      </ScrollView>
      {hasAssistant && (
        <View style={styles.assistantDock}>
          <Pressable style={styles.assistente} accessibilityRole="button" accessibilityLabel="Abrir RealInova"
            onPress={() => router.push("/realinova")}>
            <Text style={styles.balao}>Pergunte ao RealInova</Text>
            <View style={styles.botaoAssistente}><MessageCircle size={24} color="#FFFFFF" /></View>
          </Pressable>
        </View>
      )}
      <BottomTabs />
    </SafeAreaView>
  );
}
