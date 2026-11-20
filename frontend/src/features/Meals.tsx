import { useState } from "react";
import MealForm from "../screens/AdicionarCardapio/AdicionarCardapio";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { ApiError } from "../api/client";
import { mealStatuses, mealTypes, type Meal, type MealType, type StartedMeal } from "../api/reali";
import { useAction } from "../hooks/useAction";
import { useRemote } from "../hooks/useRemote";
import { api, useSession } from "../session/provider";
import { Action, Feedback, Field, isDay, labels, Page, Panel, stamp, today, ui, value } from "./ui";

const times=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const weekdays=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

export function MealList(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const school=workspace.school!.id;
  const [date,setDate]=useState(today),[time,setTime]=useState("12:00"),[type,setType]=useState<MealType>("LUNCH");
  const [form,setForm]=useState<"service"|"schedule"|null>(null),[days,setDays]=useState<number[]>([]);
  const [mode,setMode]=useState<"meals"|"schedules">("meals"),[page,setPage]=useState(1);
  const action=useAction();
  const valid=isDay(date)||/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(new Date(date+"T00:00:00Z").getTime())&&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
  const meals=useRemote(`services:${date}:${page}`,signal=>api.meals(workspace.scope,{school,date,page},signal),valid&&mode==="meals");
  const schedules=useRemote(`schedules:${page}`,signal=>api.schedules(workspace.scope,{school,page},signal),mode==="schedules");
  const result=mode==="meals"?meals:schedules;
  const open=(meal:Meal)=>router.push({pathname:"/servico",params:{id:meal.id}});
  return <Page title="Merenda" refresh={result.refresh} refreshing={result.loading}>
    <View style={ui.row}>
      <Action title="Serviços" variant={mode==="meals"?undefined:"flat"} onPress={()=>{setMode("meals");setPage(1);setForm(null);}}/>
      <Action title="Programação semanal" variant={mode==="schedules"?undefined:"flat"} onPress={()=>{setMode("schedules");setPage(1);setForm(null);}}/>
    </View>
    <Field label="Data do serviço (AAAA-MM-DD)" value={date} onChangeText={s=>{setDate(s);setPage(1);}} maxLength={10}/>
    <Feedback loading={result.loading||action.busy} error={result.error??action.error} empty={result.data?.results.length===0} retry={result.refresh}/>
    {mode==="meals"&&meals.data?.results.map(meal=><Panel key={meal.id} title={mealTypes[meal.meal_type]}>
      <Text style={ui.text}>{meal.scheduled_time.slice(0,5)} · {mealStatuses[meal.status]}</Text>
      <Action title="Detalhes do serviço" onPress={()=>open(meal)}/>
    </Panel>)}
    {mode==="schedules"&&schedules.data?.results.map(schedule=><Panel key={schedule.id} title={mealTypes[schedule.meal_type]}>
      <Text style={ui.text}>{schedule.start_time.slice(0,5)} · {schedule.weekdays.map(day=>weekdays[day-1]).join(", ")} · {schedule.is_active?"Ativa":"Inativa"}</Text>
      {session.can("manage_meals")&&schedule.is_active&&<Action title="Gerar serviço para a data indicada" disabled={!valid||action.busy} onPress={()=>void action.run(async()=>open(await api.generateMeal(workspace.scope,schedule.id,date)))}/>}
    </Panel>)}
    <Pagination page={page} next={Boolean(result.data?.next)} onChange={setPage}/>
    {session.can("manage_meals")&&<Action title={mode==="meals"?"Planejar um serviço":"Nova programação"} variant="flat" onPress={()=>setForm(mode==="meals"?"service":"schedule")}/>}
    {form&&<MealForm mode={form} type={type} time={time} weekdays={days} onType={setType} onTime={setTime} onDays={setDays}
      disabled={action.busy||!times.test(time)||(form==="service"?!valid:!days.length)} onClose={()=>setForm(null)} onSave={()=>void action.run(async()=>{
        if(form==="service"){const meal=await api.createMeal(workspace.scope,{school,date,meal_type:type,scheduled_time:time});setForm(null);open(meal);}
        else{await api.createSchedule(workspace.scope,{school,meal_type:type,weekdays:days,start_time:time});setForm(null);schedules.refresh();}
      })}/>}
  </Page>;
}
export function Pagination({page,next,onChange}:{page:number;next:boolean;onChange:(page:number)=>void}){
  if(page===1&&!next)return null;
  return <View style={ui.row}><Action title="Página anterior" variant="flat" disabled={page===1} onPress={()=>onChange(page-1)}/>
    <Action title="Próxima página" variant="flat" disabled={!next} onPress={()=>onChange(page+1)}/></View>;
}
export function MealDetail(){
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
