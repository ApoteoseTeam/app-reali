import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { Action, Feedback, labels, Page, Pagination, Panel, stamp, ui } from "../../features/ui";
import { useRemote } from "../../hooks/useRemote";
import { api, useSession } from "../../session/provider";

export default function Cameras(){
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
