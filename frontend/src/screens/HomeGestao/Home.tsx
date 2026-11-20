import { useRouter, type Href } from "expo-router";
import { ClipboardList, History, House, MessageCircle, TrendingUp, UserRound } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Dashboard } from "../../api/reali";
import { mealStatuses, mealTypes } from "../../api/reali";
import { Card } from "../../components/Card/Card";
import { IconButton } from "../../components/IconButton/IconButton";
import { Kpicard } from "../../components/KpiCard/KpiCard";
import { Logo } from "../../components/Logo/Logo";
import { Action, Feedback, labels, stamp, ui, value } from "../../features/ui";
import { NotificationBell } from "../../features/Notifications";
import { styles } from "./styles";

type HomeProps={name:string;school:string;data?:Dashboard;loading:boolean;error?:Error|null;refresh:()=>void;can:(p:string)=>boolean};
export default function Home({name,school,data,loading,error,refresh,can}:HomeProps){
  const router=useRouter();
  const tabs:{title:string;icon:typeof House;link:Href;visible:boolean}[]=[
    {title:"Início",icon:House,link:"/inicio",visible:true},
    {title:"Relatórios",icon:TrendingUp,link:"/relatorio",visible:can("indicators")},
    {title:"Merenda",icon:ClipboardList,link:"/merenda",visible:can("meal_history")},
    {title:"Histórico",icon:History,link:"/historico",visible:can("indicators")},
  ];
  const metrics=[
    {title:"Entradas registradas",number:data?.total_student_entries,visible:true},
    {title:"Pratos previstos",number:data?.total_forecast_plates,visible:can("forecast")},
    {title:"Pratos servidos",number:data?.total_served_plates,visible:can("meal_history")},
    {title:"Desvio da previsão",number:data?.forecast_difference,visible:can("meal_history")},
  ];
  return <SafeAreaView style={styles.tela}>
    <View style={styles.cabecalho}><Logo style={styles.logo}/><View style={ui.row}><NotificationBell color="#FFFFFF"/><IconButton icon={UserRound} size={19} color="#FFFFFF" accessibilityLabel="Abrir perfil" onPress={()=>router.push("/perfil")} style={styles.perfil}/></View></View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}>
      <View style={styles.saudacao}><Text accessibilityRole="header" style={styles.titulo}>Olá, {name}</Text><Text style={styles.textoSecundario}>{school}</Text>
        <Action title="Trocar organização ou escola" variant="flat" onPress={()=>router.push("/contexto")}/>
      </View>
      <Feedback loading={loading&&!data} error={error} retry={refresh} empty={data?.data_status==="NO_DATA"} stale={Boolean(data?.stale)||data?.data_status==="PROVISIONAL"}/>
      {data&&<>
        <Text style={styles.data}>{data.reference_date} · {labels(data.data_status)} · Atualizado {stamp(data.calculated_at)}</Text>
        {metrics.filter(metric=>metric.visible).map(metric=><View key={metric.title} style={styles.indicador}>
          {metric.number==null?<Card><Text style={ui.text}>{metric.title} · Indisponível</Text></Card>:<Kpicard title={metric.title} value={metric.number} variant="gestao"/>}
        </View>)}
        {can("meal_history")&&data.meal_services?.map(item=><Card key={item.id} style={styles.refeicao}>
          <Text style={styles.tituloRefeicao}>{mealTypes[item.meal_type]} · {mealStatuses[item.status]}</Text>
          <Text style={styles.textoRefeicao}>Previstos {value(item.total_forecast_plates)} · Servidos {value(item.total_served_plates)}</Text>
          <Action title="Abrir serviço" variant="flat" onPress={()=>router.push({pathname:"/servico",params:{id:item.id}})}/>
        </Card>)}
        {data.meal_services_truncated&&<Text style={ui.subdued}>A lista completa está em Merenda.</Text>}
      </>}
      <View style={ui.row}>
        {can("raw_counts")&&<Action title="Contagens" onPress={()=>router.push("/contagens")}/>}
        {can("camera_status")&&<Action title="Câmeras" onPress={()=>router.push("/cameras")}/>}
        {can("staff")&&<Action title="Funcionários" onPress={()=>router.push("/funcionarios")}/>}
        {(can("realinova_full")||can("realinova_limited"))&&<Action title="RealInova" onPress={()=>router.push("/realinova")}/>}
      </View>
      {(can("realinova_full")||can("realinova_limited"))&&<View style={styles.assistente}><IconButton icon={MessageCircle} size={27} color="#FFFFFF" accessibilityLabel="Abrir RealInova" onPress={()=>router.push("/realinova")} style={styles.botaoAssistente}/></View>}
    </ScrollView>
    <View style={styles.rodape}>{tabs.filter(tab=>tab.visible).map(({title,icon:Icon,link})=><Pressable key={title} onPress={()=>router.push(link)} accessibilityRole="tab" accessibilityState={{selected:link==="/inicio"}} style={styles.aba}><Icon color={link==="/inicio"?"#C8DFB9":"#FFFFFF"} size={22}/><Text style={[styles.textoAba,{color:"#FFFFFF"}]}>{title}</Text></Pressable>)}</View>
  </SafeAreaView>;
}
