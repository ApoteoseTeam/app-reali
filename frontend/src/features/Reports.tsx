import { useState } from "react";
import { useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { randomUUID } from "expo-crypto";
import { Platform, Text, View } from "react-native";
import { mealStatuses, mealTypes, type Group, type MealType, type Metrics } from "../api/reali";
import { useAction } from "../hooks/useAction";
import { useRemote } from "../hooks/useRemote";
import { api, useSession } from "../session/provider";
import { Pagination } from "./Meals";
import { Action, Feedback, Field, isDay, labels, Page, Panel, RangeFields, shifted, stamp, today, ui, value } from "./ui";

const groups:Record<Group,string>={daily:"Diário",weekly:"Semanal",monthly:"Mensal"};
const metricColumns=[["total_student_entries","Entradas registradas"],["total_forecast_plates","Pratos previstos"],["total_served_plates","Pratos servidos"],["forecast_difference","Desvio da previsão"],["absolute_error","Erro absoluto"],["percentage_error","Erro percentual (%)"],["mae","MAE"],["wape","WAPE (%)"]] as const;
function Totals({data,entriesOnly=false}:{data:Metrics;entriesOnly?:boolean}){
  return <>
    {metricColumns.filter((_,index)=>!entriesOnly||index===0).map(([key,label])=><Text key={key} style={ui.text}>{label} · {value(data[key])}</Text>)}
    <Text style={ui.subdued}>{labels(data.data_status)} · Cobertura {data.coverage}/{data.expected} · {stamp(data.calculated_at)}</Text>
  </>;
}
function MealFilter({selected,change}:{selected:MealType|undefined;change:(type?:MealType)=>void}){
  return <View style={ui.row}><Action title="Todas as refeições" variant={!selected?undefined:"flat"} onPress={()=>change()}/>
    {(Object.keys(mealTypes) as MealType[]).map(type=><Action key={type} title={mealTypes[type]} variant={selected===type?undefined:"flat"} onPress={()=>change(type)}/>)}</View>;
}
export function DailyReport(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const [date,setDate]=useState(today),[type,setType]=useState<MealType>(),[page,setPage]=useState(1);
  const filters={school:workspace.school!.id,date,meal_type:type};
  const report=useRemote(`report:${date}:${type}`,signal=>api.dashboard(workspace.scope,filters,signal),isDay(date));
  const meals=useRemote(`report-meals:${date}:${type}:${page}`,signal=>api.mealMetrics(workspace.scope,{...filters,page},signal),isDay(date)&&session.can("meal_history"));
  const entriesOnly=!session.can("meal_history");
  function refresh(){report.refresh();meals.refresh();}
  return <Page title="Relatório diário" refresh={refresh} refreshing={report.loading||meals.loading}>
    <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={text=>{setDate(text);setPage(1);}} maxLength={10}/>
    {!isDay(date)&&<Text role="alert" style={ui.error}>Informe uma data válida até hoje.</Text>}
    {!entriesOnly&&<MealFilter selected={type} change={item=>{setType(item);setPage(1);}}/>}
    <Feedback loading={report.loading||meals.loading} error={report.error??meals.error} empty={report.data?.data_status==="NO_DATA"} stale={Boolean(report.data?.stale)||report.data?.data_status==="PROVISIONAL"} retry={refresh}/>
    {report.data&&<Panel title={workspace.school!.name}><Totals data={report.data} entriesOnly={entriesOnly}/></Panel>}
    {meals.data?.results.map(meal=><Panel key={meal.id} title={mealTypes[meal.meal_type]}>
      <Text style={ui.text}>{mealStatuses[meal.status]} · {labels(meal.data_quality)}</Text>
      <Text style={ui.text}>Snapshot {value(meal.snapshot_entries)} · Previsão {value(meal.total_forecast_plates)} · Distribuição {value(meal.total_served_plates)}</Text>
      <Text style={ui.text}>Desvio {value(meal.forecast_difference)} · Erro absoluto {value(meal.absolute_error)}</Text>
      <Action title="Ver serviço" variant="flat" onPress={()=>router.push({pathname:"/servico",params:{id:meal.id}})}/>
    </Panel>)}
    <Pagination page={page} next={Boolean(meals.data?.next)} onChange={setPage}/>
    {session.can("analytics_reports")&&<ReportExports filters={filters} group="daily" enabled={isDay(date)}/>}
  </Page>;
}

function ReportExports({filters,group,enabled}:{filters:{school?:string;date?:string;start_date?:string;end_date?:string;meal_type?:string};group:Group;enabled:boolean}){
  const workspace=useSession().workspace!;
  const action=useAction();
  function share(format:"csv"|"pdf"){
    void action.run(async()=>{
      const bytes=await api.report(workspace.scope,{...filters,group},format);
      if(workspace.scope.signal?.aborted)return;
      const mime=format==="csv"?"text/csv":"application/pdf";
      if(Platform.OS==="web"){
        const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
        const link=document.createElement("a");
        link.href=url;link.download="reali-relatorio."+format;link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
        return;
      }
      if(!await Sharing.isAvailableAsync())throw new Error("O compartilhamento de arquivos está indisponível.");
      if(workspace.scope.signal?.aborted)return;
      const file=new File(Paths.cache,`reali-${randomUUID()}.${format}`);
      try{
        file.create();
        file.write(new Uint8Array(bytes));
        await Sharing.shareAsync(file.uri,{mimeType:mime,UTI:format==="pdf"?"com.adobe.pdf":"public.comma-separated-values-text"});
      }finally{if(file.exists)file.delete();}
    });
  }
  return <Panel title="Exportar relatório">
    <Feedback loading={action.busy} error={action.error}/>
    <View style={ui.row}><Action title="Exportar PDF" disabled={!enabled||action.busy} onPress={()=>share("pdf")}/>
    <Action title="Exportar CSV" disabled={!enabled||action.busy} variant="flat" onPress={()=>share("csv")}/></View>
  </Panel>;
}

const chartKeys=["total_student_entries","total_forecast_plates","total_served_plates"] as const;
function Trend({rows,entryOnly}:{rows:Metrics[];entryOnly:boolean}){
  const [key,setKey]=useState<typeof chartKeys[number]>("total_student_entries");
  const [shown,setShown]=useState(false);
  if(!rows.length)return null;
  if(!shown)return <Action title="Mostrar gráfico" variant="flat" onPress={()=>setShown(true)}/>;
  const max=Math.max(1,...rows.map(row=>row[key]??0));
  return <Panel title="Evolução do indicador">
    <View style={ui.row}>{(entryOnly?chartKeys.slice(0,1):chartKeys).map((metric,index)=><Action key={metric} title={metricColumns[index][1]} variant={metric===key?undefined:"flat"} onPress={()=>setKey(metric)}/>)}</View>
    <Text style={ui.subdued}>Escala desta página de 0 a {value(max)}</Text>
    {rows.filter(row=>row.date).map(row=><View key={row.date} style={{gap:4}}>
      <Text style={ui.text}>{row.date} · {value(row[key])}</Text>
      {row[key]!=null&&<View accessibilityElementsHidden style={{height:8,backgroundColor:"#E9EFE7",borderRadius:4}}>
        <View style={{width:`${Math.max(0,row[key]/max)*100}%`,height:8,backgroundColor:"#4E7AB1",borderRadius:4}}/>
      </View>}
    </View>)}
  </Panel>;
}
export function HistoryReport(){
  const session=useSession(),workspace=session.workspace!;
  const [start,setStart]=useState(()=>shifted(today(),-6)),[end,setEnd]=useState(today);
  const [group,setGroup]=useState<Group>("daily"),[type,setType]=useState<MealType>(),[page,setPage]=useState(1),[comparisonPage,setComparisonPage]=useState(1);
  const [mode,setMode]=useState<"school"|"organization">("school");
  const rangeDays=isDay(start)&&isDay(end)?(Date.parse(end)-Date.parse(start))/86400000+1:0;
  const valid=rangeDays>0&&rangeDays<=366;
  const filters={school:mode==="school"?workspace.school!.id:undefined,start_date:start,end_date:end,meal_type:type};
  const allowed=session.can("analytics_reports"),entryOnly=!session.can("meal_history");
  const key=JSON.stringify(filters);
  const history=useRemote(`history:${group}:${key}:${page}`,signal=>api.history(workspace.scope,group,{...filters,page},signal),valid);
  const summary=useRemote(`summary:${key}`,signal=>api.summary(workspace.scope,filters,signal),valid&&allowed);
  const schools=useRemote(`school-comparison:${key}:${comparisonPage}`,signal=>api.comparison(workspace.scope,{...filters,page:comparisonPage},signal),valid&&allowed&&mode==="organization");
  function refresh(){history.refresh();summary.refresh();schools.refresh();}
  return <Page title="Histórico de merenda" refresh={refresh} refreshing={history.loading}>
    <RangeFields start={start} end={end} onStart={value=>{setStart(value);setPage(1);setComparisonPage(1);}} onEnd={value=>{setEnd(value);setPage(1);setComparisonPage(1);}}/>
    {!valid&&<Text role="alert" style={ui.error}>Informe um período válido de até 366 dias.</Text>}
    <View style={ui.row}>{(Object.keys(groups) as Group[]).map(option=><Action key={option} title={groups[option]} variant={group===option?undefined:"flat"} onPress={()=>{setGroup(option);setPage(1);}}/>)}</View>
    {!entryOnly&&<MealFilter selected={type} change={item=>{setType(item);setPage(1);setComparisonPage(1);}}/>}
    {allowed&&<View style={ui.row}><Action title="Escola selecionada" variant={mode==="school"?undefined:"flat"} onPress={()=>{setMode("school");setPage(1);}}/>
      <Action title="Visão institucional" variant={mode==="organization"?undefined:"flat"} onPress={()=>{setMode("organization");setPage(1);setComparisonPage(1);}}/></View>}
    <Feedback loading={history.loading||summary.loading||schools.loading} error={history.error??summary.error??schools.error} empty={history.data?.results.length===0||history.data?.results.every(row=>row.data_status==="NO_DATA")} retry={refresh}/>
    {summary.data&&<Panel title="Comparar com o período anterior">
      <Text style={ui.subdued}>{summary.data.previous_period.start_date} a {summary.data.previous_period.end_date}</Text>
      {metricColumns.slice(0,3).map(([field,label])=><Text key={field} style={ui.text}>{label} · Atual {value(summary.data!.summary[field])} · Anterior {value(summary.data!.previous[field])} · Variação {value(summary.data!.comparison[field])}</Text>)}
    </Panel>}
    {schools.data&&<Panel title="Comparação entre escolas">{schools.data.results.map(row=><View key={row.school_id}><Text style={ui.title}>{workspace.schools.find(item=>item.id===row.school_id)?.name??"Escola autorizada"}</Text><Totals data={row}/></View>)}
      <Pagination page={comparisonPage} next={Boolean(schools.data.next)} onChange={setComparisonPage}/></Panel>}
    {history.data&&<><Trend rows={history.data.results} entryOnly={entryOnly}/>
      {history.data.results.map(row=><Panel key={row.date} title={row.date}><Totals data={row} entriesOnly={entryOnly}/></Panel>)}
      <Pagination page={page} next={Boolean(history.data.next)} onChange={setPage}/>
    </>}
    {allowed&&<ReportExports filters={filters} group={group} enabled={valid&&rangeDays<=90}/>}
  </Page>;
}
