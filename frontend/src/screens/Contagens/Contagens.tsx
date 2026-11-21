import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { mealTypes, type Count } from "../../api/reali";
import { useAction } from "../../hooks/useAction";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";
import { Action, Feedback, Field, isDay, labels, Page, Pagination, Panel, RangeFields, stamp, today, ui, value } from "../../features/ui";

const sao=new Intl.DateTimeFormat("en",{timeZone:"America/Sao_Paulo",timeZoneName:"longOffset"});
function bound(day:string,end:boolean){
  const timeZone=sao.formatToParts(new Date(day+"T12:00:00Z")).find(part=>part.type==="timeZoneName")?.value;
  return day+(end?"T23:59:59.999999":"T00:00:00")+(timeZone?.slice(3)||"-03:00");
}
export default function Contagens(){
  const session=useSession(),workspace=session.workspace!,router=useRouter();
  const params=useLocalSearchParams<{meal?:string;date?:string}>();
  const [kind,setKind]=useState<"student"|"plate">(params.meal?"plate":"student");
  const [start,setStart]=useState(params.date&&isDay(params.date)?params.date:today()),[end,setEnd]=useState(start);
  const [meal,setMeal]=useState<string|undefined>(params.meal),[camera,setCamera]=useState<string>();
  const [page,setPage]=useState(1),[editing,setEditing]=useState<Count|null>(null);
  const [delta,setDelta]=useState(""),[reason,setReason]=useState(""),[notice,setNotice]=useState("");
  const pendingAdjustment = useRef<{ fingerprint: string; key: string } | null>(null);
  const valid=isDay(start)&&isDay(end)&&start<=end&&(Date.parse(end)-Date.parse(start))/86400000<93;
  const school=workspace.school!.id;
  const query={school,camera,meal_service:kind==="plate"?meal:undefined,...(start===end?{date:start}:valid?{start_at:bound(start,false),end_at:bound(end,true)}:{})};
  const key=JSON.stringify(query);
  const summary=useRemote(`counts-summary:${kind}:${key}`,signal=>api.countSummary(workspace.scope,kind,query,signal),valid);
  const records=useRemote(`counts:${kind}:${key}:${page}`,signal=>api.counts(workspace.scope,kind,{...query,page},signal),valid);
  const cameras=useRemote(`count-cameras:${kind}`,signal=>api.cameras(workspace.scope,{school,camera_type:kind==="student"?"ENTRANCE":"CAFETERIA"},signal),session.can("camera_status"));
  const meals=useRemote(`count-meals:${end}`,signal=>api.meals(workspace.scope,{school,date:end},signal),valid&&kind==="plate"&&session.can("meal_history"));
  const action=useAction();
  function refresh(){summary.refresh();records.refresh();cameras.refresh();meals.refresh();}
  function resetFilters(){setEditing(null);setPage(1);setNotice("");}
  async function submitAdjustment(row: Count) {
    const body = {
      event_type: kind === "student" ? "STUDENT_ENTRY" as const : "PLATE_SERVED" as const,
      count_id: row.id, delta: Number(delta), reason: reason.trim(),
    };
    const fingerprint = JSON.stringify(body);
    if (pendingAdjustment.current?.fingerprint !== fingerprint) {
      pendingAdjustment.current = { fingerprint, key: randomUUID() };
    }
    await api.adjustCount(workspace.scope, body, pendingAdjustment.current.key);
    pendingAdjustment.current = null;
    setEditing(null);
    setNotice("Ajuste registrado.");
    refresh();
  }
  return <Page title="Contagens" refresh={refresh} refreshing={summary.loading||records.loading}>
    <View style={ui.row}><Action title="Entradas" variant={kind==="student"?undefined:"flat"} onPress={()=>{setKind("student");setCamera(undefined);setMeal(undefined);resetFilters();}}/>
    <Action title="Pratos servidos" variant={kind==="plate"?undefined:"flat"} onPress={()=>{setKind("plate");setCamera(undefined);resetFilters();}}/></View>
    <RangeFields start={start} end={end} onStart={text=>{setStart(text);setMeal(undefined);resetFilters();}} onEnd={text=>{setEnd(text);setMeal(undefined);resetFilters();}}/>
    {!valid&&<Text role="alert" style={ui.error}>Use um intervalo de até 93 dias e datas até hoje.</Text>}
    {cameras.data&&<Panel title={kind==="student"?"Câmeras da portaria":"Câmeras da cantina"}>
      <Action title="Todas as câmeras" variant={!camera?undefined:"flat"} onPress={()=>{setCamera(undefined);resetFilters();}}/>
      {cameras.data.results.map(item=><View key={item.id} style={ui.row}>
        <Action title={item.name} variant={camera===item.id?undefined:"flat"} onPress={()=>{setCamera(item.id);resetFilters();}}/>
        <Action title={labels(item.operational_status)} variant="flat" onPress={()=>router.push({pathname:"/camera",params:{id:item.id}})}/>
      </View>)}
    </Panel>}
    {kind==="plate"&&(meal||meals.data)&&<Panel title="Serviço de merenda">
      <Action title="Todos os serviços" variant={!meal?undefined:"flat"} onPress={()=>{setMeal(undefined);resetFilters();}}/>
      {meals.data?.results.map(item=><Action key={item.id} title={`${mealTypes[item.meal_type]} · ${item.scheduled_time.slice(0,5)}`} variant={meal===item.id?undefined:"flat"}
        onPress={()=>{setMeal(item.id);resetFilters();}}/>)}
    </Panel>}
    <Feedback loading={summary.loading||records.loading||action.busy} error={summary.error??records.error??cameras.error??meals.error??action.error} empty={records.data?.results.length===0} retry={refresh}/>
    {summary.data&&<Panel title={kind==="student"?"Total de entradas":"Total de pratos servidos"}>
      <Text style={ui.title}>{value(summary.data.last_updated?(kind==="student"?summary.data.student_entries:summary.data.served_plates):null)}</Text>
      <Text style={ui.subdued}>Atualizado {stamp(summary.data.last_updated)} · Ajustes {value(summary.data.adjustment)}</Text>
    </Panel>}
    {notice&&<Text accessibilityRole="alert" style={ui.text}>{notice}</Text>}
    {records.data?.results.map(row=><Panel key={row.id}>
      <Text style={ui.text}>{row.quantity} · {stamp(row.recorded_at)}</Text>
      <Text style={ui.subdued}>{cameras.data?.results.find(c=>c.id===row.camera)?.name??"Câmera do registro"}</Text>
      {row.meal_service&&<Action title="Ver serviço relacionado" variant="flat" onPress={()=>router.push({pathname:"/servico",params:{id:row.meal_service}})}/>}
      {session.can("adjust_counts")&&<Action title="Registrar ajuste auditado" variant="flat" onPress={()=>{setEditing(row);setDelta("");setReason("");action.setError(null);}}/>}
      {editing?.id===row.id&&<>
        <Field label="Variação inteira" keyboardType="numbers-and-punctuation" value={delta} onChangeText={setDelta}/>
        <Field label="Motivo da correção" value={reason} onChangeText={setReason} maxLength={500}/>
        <Action title="Confirmar ajuste" disabled={action.busy||!/^-?\d+$/.test(delta)||!Number(delta)||Math.abs(Number(delta))>100000||!reason.trim()}
          onPress={()=>void action.run(()=>submitAdjustment(row))}/>
      </>}
    </Panel>)}
    <Pagination page={page} next={Boolean(records.data?.next)} onChange={setPage}/>
  </Page>;
}
