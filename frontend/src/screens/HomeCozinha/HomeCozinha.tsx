import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card/Card";
import { Logo } from "../../components/Logo/Logo";
import { Action, Feedback, labels, stamp, ui, value } from "../../features/ui";
import { NotificationBell } from "../../components/NotificationBell/NotificationBell";
import { mealStatuses, mealTypes, type Dashboard } from "../../api/reali";
import { styles } from "./styles";

type Props={name:string;school:string;data?:Dashboard;loading:boolean;error?:Error;refresh:()=>void};
export default function HomeCozinha({name,school,data,loading,error,refresh}:Props){
  const router=useRouter();
  return <SafeAreaView style={styles.tela}>
    <View style={styles.cabecalho}><Logo variant="mark" style={styles.logo}/><NotificationBell color="#FFFFFF"/></View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}>
      <View style={styles.saudacao}><Text accessibilityRole="header" style={styles.titulo}>Olá, {name}</Text>
      <Text style={styles.data}>{school} · {data?.reference_date}</Text></View>
      <Feedback loading={loading&&!data} error={error} retry={refresh} empty={data?.data_status==="NO_DATA"} stale={Boolean(data?.stale)||data?.data_status==="PROVISIONAL"}/>
      {data&&<Card style={styles.cartao}>
        <Text style={styles.rotulo}>ENTRADAS REGISTRADAS</Text>
        <Text style={styles.numero}>{value(data.total_student_entries)}</Text>
        <Text style={styles.planejamento}>Previstos {value(data.total_forecast_plates)} · Servidos {value(data.total_served_plates)}</Text>
        <Text style={ui.subdued}>Desvio {value(data.forecast_difference)} · {labels(data.data_status)} · {stamp(data.calculated_at)}</Text>
      </Card>}
      {data?.meal_services?.map(meal=><Card key={meal.id}><Text style={ui.title}>{mealTypes[meal.meal_type]} · {mealStatuses[meal.status]}</Text>
        <Action title="Abrir serviço" variant="flat" onPress={()=>router.push({pathname:"/servico",params:{id:meal.id}})}/></Card>)}
      <Action title="Trocar escola" variant="flat" onPress={()=>router.push("/contexto")}/>
      <View style={ui.row}><Action title="Merenda" onPress={()=>router.push("/merenda")}/><Action title="Relatórios" onPress={()=>router.push("/relatorio")}/><Action title="Histórico" onPress={()=>router.push("/historico")}/><Action title="Câmeras" onPress={()=>router.push("/cameras")}/></View>
    </ScrollView>
    <View style={[styles.rodape,ui.row]}><Action title="RealInova" onPress={()=>router.push("/realinova")}/><Action title="Perfil" onPress={()=>router.push("/perfil")}/></View>
  </SafeAreaView>;
}
