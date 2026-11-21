import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "react-native";
import { ApiError } from "../../api/client";
import { mealStatuses, mealTypes, type Meal, type StartedMeal } from "../../api/reali";
import { Action, Feedback, Field, labels, Page, Panel, stamp, today, ui, value } from "../../features/ui";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";

export default function ServicoMerenda(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const {id}=useLocalSearchParams<{id:string}>();
  const [local,setLocal]=useState<Meal|null>(null),[started,setStarted]=useState<StartedMeal|null>(null);
  const [confirm,setConfirm]=useState<"finish"|"cancel"|null>(null),[reason,setReason]=useState("");
  const action=useAction();
  const detail=useRemote(`meal:${id}`,async signal=>{
    const meal=await api.meal(workspace.scope,id,signal);
    if(meal.school!==workspace.school!.id)throw new ApiError(404,"WRONG_SCHOOL","Selecione a escola deste serviço no contexto institucional.");
    return meal;
  },typeof id==="string");
  const meal=local??detail.data;
  const forecast=useRemote(`forecast:${id}`,async signal=>{
    try{return await api.forecasts(workspace.scope,id,signal);}catch(error){if(error instanceof ApiError&&error.status===404)return null;throw error;}
  },Boolean(meal&&meal.status!=="PLANNED"&&session.can("forecast")&&!started));
  const snapshot=useRemote(`snapshot:${id}`,async signal=>{
    try{return await api.snapshot(workspace.scope,id,signal);}catch(error){if(error instanceof ApiError&&error.status===404)return null;throw error;}
  },Boolean(meal&&meal.status!=="PLANNED"&&session.can("forecast")&&!started));
  const metrics=useRemote(`meal-metrics:${id}`,signal=>api.mealMetric(workspace.scope,id,signal),Boolean(meal));
  function refresh(){setLocal(null);setStarted(null);detail.refresh();forecast.refresh();snapshot.refresh();metrics.refresh();}
  async function transition(name:"start"|"start-serving"|"finish"|"cancel"){
    const result=await action.run(async()=>name==="start"?api.start(workspace.scope,id):api.transition(workspace.scope,id,name,name==="cancel"?reason.trim():undefined));
    if(!result){detail.refresh();setLocal(null);return;}
    if("attendance_snapshot" in result)setStarted(result as StartedMeal);
    setLocal(result);setConfirm(null);metrics.refresh();
  }
  const frozen=started?.attendance_snapshot??snapshot.data;
  const expected=started?.forecast??forecast.data;
  const canOperate=session.can("prepare");
  return <Page title="Serviço de merenda" refresh={refresh} refreshing={detail.loading}>
    <Feedback loading={detail.loading||action.busy} error={detail.error??action.error??forecast.error??snapshot.error??metrics.error} retry={refresh}/>
    {meal&&<Panel title={mealTypes[meal.meal_type]}>
      <Text style={ui.text}>{meal.date} · {meal.scheduled_time.slice(0,5)} · {mealStatuses[meal.status]}</Text>
      <Text style={ui.text}>Distribuição {labels(meal.serving_data_quality)}</Text>
      <Text style={ui.text}>Entradas congeladas no preparo {value(frozen?.total_student_entries)}</Text>
      {frozen&&<Text style={ui.subdued}>{labels(frozen.data_quality_status)} · {stamp(frozen.reference_time)}</Text>}
      <Text style={ui.text}>Pratos previstos {value(expected?.forecast_plates)}</Text>
      {expected&&<Text style={ui.subdued}>{expected.method} · {expected.confidence_status}</Text>}
      <Text style={ui.text}>Pratos servidos {value(metrics.data?.total_served_plates)}</Text>
      <Text style={ui.text}>Desvio da previsão {value(metrics.data?.forecast_difference)}</Text>
      {canOperate&&meal.status==="PLANNED"&&meal.date<=today()&&<Action title="Iniciar preparo" disabled={action.busy} onPress={()=>void transition("start")}/>}
      {canOperate&&meal.status==="PREPARING"&&<Action title="Iniciar distribuição" disabled={action.busy} onPress={()=>void transition("start-serving")}/>}
      {canOperate&&meal.status==="SERVING"&&<Action title="Finalizar serviço" disabled={action.busy} onPress={()=>setConfirm("finish")}/>}
      {session.can("manage_meals")&&["PLANNED","PREPARING"].includes(meal.status)&&<Action title="Cancelar serviço" variant="danger" disabled={action.busy} onPress={()=>setConfirm("cancel")}/>}
      {session.can("raw_counts")&&<Action title="Contagens deste serviço" variant="flat" onPress={()=>router.push({pathname:"/contagens",params:{meal:id,date:meal.date}})}/>}
    </Panel>}
    {confirm&&<Panel title={confirm==="finish"?"Confirmar finalização":"Confirme o cancelamento"}>
      {confirm==="cancel"&&<Field label="Motivo" value={reason} onChangeText={setReason} maxLength={500}/>}
      <Action title="Confirmar" disabled={action.busy||confirm==="cancel"&&!reason.trim()} onPress={()=>void transition(confirm)}/>
      <Action title="Voltar" variant="flat" disabled={action.busy} onPress={()=>setConfirm(null)}/>
    </Panel>}
  </Page>;
}
