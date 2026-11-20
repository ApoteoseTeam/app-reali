import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { ApiError } from "../api/client";
import { useAction } from "../hooks/useAction";
import { useRemote } from "../hooks/useRemote";
import { api, useSession } from "../session/provider";
import { Pagination } from "./Meals";
import CameraSettings from "./CameraSettings";
import { Action, Feedback, Field, labels, Page, Panel, stamp, ui } from "./ui";

export function CameraList(){
  const workspace=useSession().workspace!,router=useRouter();
  const [page,setPage]=useState(1);
  const cameras=useRemote(`cameras:${page}`,signal=>api.cameras(workspace.scope,{school:workspace.school!.id,page},signal));
  return <Page title="Câmeras" refresh={cameras.refresh} refreshing={cameras.loading}>
    <Feedback loading={cameras.loading} error={cameras.error} empty={cameras.data?.results.length===0} retry={cameras.refresh}/>
    {cameras.data?.results.map(camera=><Panel key={camera.id} title={camera.name}>
      <Text style={ui.text}>{camera.camera_type==="ENTRANCE"?"Portaria":"Cantina"} · {labels(camera.operational_status)}</Text>
      <Text style={ui.subdued}>{camera.is_active?"Ativa administrativamente":"Inativa administrativamente"} · Última comunicação {stamp(camera.last_seen_at)}</Text>
      <Action title="Detalhes da câmera" onPress={()=>router.push({pathname:"/camera",params:{id:camera.id}})}/>
    </Panel>)}
    <Pagination page={page} next={Boolean(cameras.data?.next)} onChange={setPage}/>
  </Page>;
}
const reasons:Record<string,string>={timeout:"Comunicação interrompida",video_unavailable:"Vídeo indisponível",detector_unavailable:"Detector indisponível",warming_up:"Em inicialização",low_fps:"Processamento abaixo do limite",pending_events:"Acúmulo de eventos",healthy:"Operação normal"};
export function CameraDetail(){
  const session=useSession(),workspace=session.workspace!;
  const {id}=useLocalSearchParams<{id:string}>();
  const [page,setPage]=useState(1),[edit,setEdit]=useState(false),[confirm,setConfirm]=useState(false);
  const [name,setName]=useState(""),[location,setLocation]=useState("");
  const action=useAction();
  const status=useRemote(`camera:${id}`,async signal=>{
    const camera=await api.cameraStatus(workspace.scope,id,signal);
    if(camera.school!==workspace.school!.id)throw new ApiError(404,"WRONG_SCHOOL","Selecione a escola desta câmera no contexto institucional.");
    return camera;
  },typeof id==="string");
  const history=useRemote(`camera-history:${id}:${page}`,signal=>api.cameraHistory(workspace.scope,id,signal,page),Boolean(status.data)&&session.can("camera_history"));
  const camera=status.data;
  return <Page title="Detalhes da câmera" refresh={()=>{status.refresh();history.refresh();}} refreshing={status.loading||history.loading}>
    <Feedback loading={status.loading||history.loading||action.busy} error={status.error??history.error??action.error} retry={status.refresh}/>
    {camera&&<>
      <Panel title={camera.name}>
        <Text style={ui.text}>{camera.camera_type==="ENTRANCE"?"Portaria":"Cantina"} · {workspace.school!.name}</Text>
        {camera.location&&<Text style={ui.subdued}>{camera.location}</Text>}
        <Text style={ui.text}>Conexão {labels(camera.operational_status)}</Text>
        <Text style={ui.text}>Cadastro {camera.is_active?"Ativo":"Inativo"}</Text>
        <Text style={ui.subdued}>Última comunicação {stamp(camera.last_seen_at)}</Text>
        {camera.detector_status&&<Text style={ui.subdued}>Detector {labels(camera.detector_status)}</Text>}
        {camera.status_reason&&<Text style={ui.subdued}>{reasons[camera.status_reason]??labels(camera.operational_status)}</Text>}
        {session.can("camera_admin")&&<View style={ui.row}>
          <Action title="Editar identificação" variant="flat" onPress={()=>{setName(camera.name);setLocation(camera.location);setEdit(!edit);}}/>
          <Action title={camera.is_active?"Desativar câmera":"Ativar câmera"} variant={camera.is_active?"danger":undefined} onPress={()=>setConfirm(true)}/>
        </View>}
      </Panel>
      {edit&&<Panel><Field label="Nome" value={name} onChangeText={setName} maxLength={150}/><Field label="Localização" value={location} onChangeText={setLocation} maxLength={255}/>
        <Action title="Salvar identificação" disabled={!name.trim()||action.busy} onPress={()=>void action.run(async()=>{await api.cameraEdit(workspace.scope,id,{name:name.trim(),location:location.trim()});setEdit(false);status.refresh();})}/>
      </Panel>}
      {confirm&&<Panel title={camera.is_active?"Confirme a desativação":"Confirme a ativação"}>
        <Action title="Confirmar" disabled={action.busy} onPress={()=>void action.run(async()=>{await api.cameraActive(workspace.scope,id,!camera.is_active);setConfirm(false);status.refresh();history.refresh();})}/>
        <Action title="Voltar" variant="flat" onPress={()=>setConfirm(false)}/>
      </Panel>}
    </>}
    {camera&&session.can("camera_admin")&&<CameraSettings camera={camera}/>}
    {history.data&&<Panel title="Histórico técnico">
      <Feedback empty={history.data.results.length===0}/>
      {history.data.results.map(event=><View key={event.id}><Text style={ui.text}>{event.message||labels(event.new_status)}</Text><Text style={ui.subdued}>{stamp(event.occurred_at)}</Text></View>)}
      <Pagination page={page} next={Boolean(history.data.next)} onChange={setPage}/>
    </Panel>}
  </Page>;
}
