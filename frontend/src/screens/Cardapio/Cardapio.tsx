import { useState } from "react";
import { useRouter } from "expo-router";
import { CalendarDays, ChevronRight, Utensils } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { mealStatuses, mealTypes, type Meal, type MealType } from "../../api/reali";
import { Card } from "../../components/Card/Card";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";
import { Action, Feedback, Field, isDay, Page, Pagination, today, ui } from "../../features/ui";
import { colors } from "../../theme/colors";
import MealForm from "../AdicionarCardapio/AdicionarCardapio";
import { styles } from "./styles";

const times=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const weekdays=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const categories = ["Serviços", "Programação semanal"];

export default function Cardapio(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const school=workspace.school!.id;
  const [date,setDate]=useState(today),[time,setTime]=useState("12:00"),[type,setType]=useState<MealType>("LUNCH");
  const [form,setForm]=useState<"service"|"schedule"|null>(null),[days,setDays]=useState<number[]>([]);
  const [name,setName]=useState("");
  const [mode,setMode]=useState<"meals"|"schedules">("meals"),[page,setPage]=useState(1);
  const action=useAction();
  const valid=isDay(date)||/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(new Date(date+"T00:00:00Z").getTime())&&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
  const meals=useRemote(`services:${date}:${page}`,signal=>api.meals(workspace.scope,{school,date,page},signal),valid&&mode==="meals");
  const schedules=useRemote(`schedules:${page}`,signal=>api.schedules(workspace.scope,{school,page},signal),mode==="schedules");
  const result=mode==="meals"?meals:schedules;
  const open=(meal:Meal)=>router.push({pathname:"/servico",params:{id:meal.id}});
  function changeDate(next: string){ setDate(next); setPage(1); }
  if(form&&session.can("manage_meals")){
    return <MealForm mode={form} data={date} type={type} time={time} weekdays={days} name={name}
      onDate={changeDate} onType={setType} onTime={setTime} onDays={setDays} onName={setName}
      loading={action.busy} error={action.error}
      disabled={action.busy||!times.test(time)||(form==="service"?!valid:!days.length||!name.trim())}
      onClose={()=>setForm(null)} onSave={()=>void action.run(async()=>{
        if(form==="service"){
          const meal=await api.createMeal(workspace.scope,{school,date,meal_type:type,scheduled_time:time});
          meals.refresh();
          setForm(null);
          open(meal);
        }else{
          await api.createSchedule(workspace.scope,{school,name:name.trim(),meal_type:type,weekdays:days,start_time:time});
          schedules.refresh();
          setPage(1);
          setName("");
          setForm(null);
        }
      })}/>;
  }
  return <Page management title="Cardápio" refresh={result.refresh} refreshing={result.loading}
    footer={session.can("manage_meals") && <Action title={mode==="meals"?"Planejar um serviço":"Nova programação"} variant="primary"
      onPress={()=>{action.setError(null);setForm(mode==="meals"?"service":"schedule");}}/>}>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>Serviços de merenda</Text>
      <Text style={styles.meta}>{workspace.school!.name}</Text>
    </View>
    <SegmentedControl variant="underline" opcoes={categories} selecionado={categories[mode==="meals"?0:1]}
      aoSelecionar={option=>{setMode(option===categories[0]?"meals":"schedules");setPage(1);setForm(null);}}/>
    <View style={styles.context}>
      <Field label="Data do serviço" value={date} onChangeText={changeDate} maxLength={10}
        placeholder="AAAA-MM-DD" style={styles.field}/>
      {!valid && <Text accessibilityRole="alert" style={ui.error}>Informe uma data válida no formato AAAA-MM-DD.</Text>}
    </View>
    <Feedback loading={result.loading||action.busy} error={result.error??action.error} empty={result.data?.results.length===0} retry={result.refresh}/>
    <View style={styles.list}>
      {mode==="meals" && meals.data?.results.map(meal=>(
        <Pressable key={meal.id} accessibilityRole="button"
          accessibilityLabel={`Detalhes do serviço de ${mealTypes[meal.meal_type]}, ${meal.scheduled_time.slice(0,5)}`}
          style={[styles.meal,styles.mealHeader]} onPress={()=>open(meal)}>
          <View style={styles.icon}><Utensils color={colors.secondary} size={17}/></View>
          <View style={styles.mealIdentity}>
            <Text style={styles.time}>{meal.scheduled_time.slice(0,5)}</Text>
            <Text style={styles.mealLabel}>{mealTypes[meal.meal_type]}</Text>
            <Text style={styles.meta}>{mealStatuses[meal.status]}</Text>
          </View>
          <ChevronRight color={colors.secondary} size={18}/>
        </Pressable>
      ))}
      {mode==="schedules" && schedules.data?.results.map(schedule=>(
        <Card key={schedule.id} style={styles.schedule}>
          <View style={styles.mealHeader}>
            <CalendarDays color={colors.white} size={20}/>
            <View style={styles.mealIdentity}>
              <Text accessibilityRole="header" style={styles.scheduleTitle}>{schedule.name}</Text>
              <Text style={styles.scheduleCaption}>{mealTypes[schedule.meal_type]} · {schedule.start_time.slice(0,5)} · {schedule.is_active?"Ativa":"Inativa"}</Text>
              <Text style={styles.scheduleCaption}>{schedule.weekdays.map(day=>weekdays[day-1]).join(", ")}</Text>
            </View>
          </View>
          {session.can("manage_meals") && schedule.is_active &&
            <Action title="Gerar serviço para a data indicada" variant="flat" disabled={!valid||action.busy}
              onPress={()=>void action.run(async()=>open(await api.generateMeal(workspace.scope,schedule.id,date)))}/>}
        </Card>
      ))}
      <Pagination page={page} next={Boolean(result.data?.next)} onChange={setPage}/>
    </View>
  </Page>;
}
