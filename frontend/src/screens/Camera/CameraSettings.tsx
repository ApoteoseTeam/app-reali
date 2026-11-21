import {useState} from "react";
import {Text,View} from "react-native";
import {ApiError} from "../../api/client";
import type {Camera,CameraParameters,Point} from "../../api/reali";
import {useAction} from "../../hooks/useAction";
import {useRemote} from "../../hooks/useRemote";
import {api,useSession} from "../../session/provider";
import {Action,Feedback,Field,Panel,stamp,ui} from "../../features/ui";

type Form={fps:string;confidence:string;version:string;x1:string;y1:string;x2:string;y2:string};
const keys=["x1","y1","x2","y2"] as const;
const number=(text:string)=>text.trim()?Number(text.trim().replace(",",".")):Number.NaN;
function draft(parameters?:CameraParameters):Form{
  const line=parameters?.counting_line,region=parameters?.region_of_interest;
  const points=line?[line.start,line.end]:region?[region.top_left,region.bottom_right]:[];
  return {fps:String(parameters?.desired_fps??""),confidence:String(parameters?.confidence_threshold??""),version:parameters?.algorithm_version??"",
    x1:String(points[0]?.x??""),y1:String(points[0]?.y??""),x2:String(points[1]?.x??""),y2:String(points[1]?.y??"")};
}
export default function CameraSettings({camera}:{camera:Camera}){
  const workspace=useSession().workspace!;
  const action=useAction();
  const config=useRemote(`camera-config:${camera.id}`,async signal=>{
    try{return await api.cameraConfig(workspace.scope,camera.id,signal);}
    catch(error){if(error instanceof ApiError&&error.status===404)return null;throw error;}
  });
  const [form,setForm]=useState<Form|null>(null);
  const [trigger,setTrigger]=useState<CameraParameters["trigger"]>("LINE_CROSSING");
  const [direction,setDirection]=useState<NonNullable<CameraParameters["counting_line"]>["direction"]>("NEGATIVE_TO_POSITIVE");
  const [notice,setNotice]=useState("");
  function open(){
    const previous=config.data?.parameters;
    setTrigger(previous?.trigger??"LINE_CROSSING");
    setDirection(previous?.counting_line?.direction??"NEGATIVE_TO_POSITIVE");
    setForm(draft(previous));setNotice("");action.setError(null);
  }
  function save(){
    if(!form)return;
    void action.run(async()=>{
      const fps=number(form.fps),confidence=number(form.confidence);
      const [x1,y1,x2,y2]=keys.map(key=>number(form[key]));
      if(!(fps>=0.1&&fps<=240&&confidence>=0&&confidence<=1))throw new Error("Informe FPS entre 0,1 e 240 e confiança entre 0 e 1.");
      if(!/^[A-Za-z0-9][A-Za-z0-9_.+-]{0,49}$/.test(form.version))throw new Error("Confira a versão do algoritmo.");
      if(![x1,y1,x2,y2].every(coordinate=>coordinate>=0&&coordinate<=1))throw new Error("As coordenadas precisam estar entre 0 e 1.");
      const a:Point={x:x1,y:y1},b:Point={x:x2,y:y2};
      if(trigger==="DELIVERY_ZONE"?x1>=x2||y1>=y2:x1===x2&&y1===y2)throw new Error("Confira os dois pontos da região ou linha.");
      const previous=config.data?.parameters;
      const body:CameraParameters={event_kind:camera.camera_type==="ENTRANCE"?"STUDENT_ENTRY":"PLATE_DELIVERY",trigger,
        desired_fps:fps,confidence_threshold:confidence,algorithm_version:form.version,
        ...(trigger==="LINE_CROSSING"?{counting_line:{start:a,end:b,direction},region_of_interest:previous?.trigger==="LINE_CROSSING"?previous.region_of_interest:undefined}:{region_of_interest:{top_left:a,bottom_right:b}}),
        tracker:previous?.tracker};
      const saved=await api.saveCameraConfig(workspace.scope,camera.id,body);
      setForm(null);setNotice(`Configuração salva · Versão ${saved.version}`);config.refresh();
    });
  }
  return <Panel title="Configuração técnica">
    <Feedback loading={config.loading||action.busy} error={config.error??action.error} retry={config.refresh}/>
    {notice&&<Text accessibilityRole="alert" style={ui.text}>{notice}</Text>}
    {config.data&&<Text style={ui.subdued}>Versão {config.data.version} · {config.data.parameters.desired_fps} FPS · Atualizada {stamp(config.data.updated_at)}</Text>}
    {config.data===null&&<Text style={ui.subdued}>Câmera sem configuração cadastrada.</Text>}
    {!form&&!config.loading&&!config.error&&<Action title={config.data?"Editar parâmetros":"Configurar câmera"} variant="flat" onPress={open}/>}
    {form&&<>
      {camera.camera_type==="CAFETERIA"&&<View style={ui.row}><Action title="Linha de contagem" variant={trigger==="LINE_CROSSING"?undefined:"flat"} onPress={()=>{setTrigger("LINE_CROSSING");setForm({...form,x1:"",y1:"",x2:"",y2:""});}}/><Action title="Região de entrega" variant={trigger==="DELIVERY_ZONE"?undefined:"flat"} onPress={()=>{setTrigger("DELIVERY_ZONE");setForm({...form,x1:"",y1:"",x2:"",y2:""});}}/></View>}
      <Field label="FPS desejado" keyboardType="decimal-pad" value={form.fps} onChangeText={fps=>setForm({...form,fps})}/>
      <Field label="Limiar de confiança" keyboardType="decimal-pad" value={form.confidence} onChangeText={confidence=>setForm({...form,confidence})}/>
      <Field label="Versão do algoritmo" value={form.version} onChangeText={version=>setForm({...form,version})} maxLength={50} autoCapitalize="none"/>
      <Text style={ui.subdued}>{trigger==="LINE_CROSSING"?"Pontos de início e fim da linha, em coordenadas normalizadas.":"Cantos superior esquerdo e inferior direito, em coordenadas normalizadas."}</Text>
      {keys.map(key=><Field key={key} label={key.toUpperCase()} keyboardType="decimal-pad" value={form[key]} onChangeText={value=>setForm({...form,[key]:value})}/>)}
      {trigger==="LINE_CROSSING"&&<View style={ui.row}><Action title="Negativo para positivo" variant={direction==="NEGATIVE_TO_POSITIVE"?undefined:"flat"} onPress={()=>setDirection("NEGATIVE_TO_POSITIVE")}/><Action title="Positivo para negativo" variant={direction==="POSITIVE_TO_NEGATIVE"?undefined:"flat"} onPress={()=>setDirection("POSITIVE_TO_NEGATIVE")}/></View>}
      <Action title="Salvar configuração" disabled={action.busy} onPress={save}/>
      <Action title="Voltar aos detalhes" variant="flat" disabled={action.busy} onPress={()=>setForm(null)}/>
    </>}
  </Panel>;
}
