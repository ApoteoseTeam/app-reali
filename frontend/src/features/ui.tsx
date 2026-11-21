import { useCanGoBack, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../api/client";
import { Header } from "../components/header/header";
import { IconButton } from "../components/IconButton/IconButton";
import { Logo } from "../components/Logo/Logo";
import { colors } from "../theme/colors";

export const ui=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},
  header:{backgroundColor:colors.primary,padding:16,gap:5},
  headerTitleRow:{flexDirection:"row",alignItems:"center",gap:8},
  headerMark:{width:30,height:28,alignItems:"center",justifyContent:"center"},
  headerMarkImage:{width:60,height:60},
  headerTitle:{color:colors.white,fontSize:23,fontWeight:"700",flexShrink:1},
  headerAction:{color:colors.white,fontWeight:"600",minHeight:28,paddingVertical:4},
  scroll:{padding:18,gap:12,paddingBottom:32},
  panel:{backgroundColor:colors.white,borderColor:"#DCE7D7",borderWidth:1,borderRadius:15,padding:15,gap:8},
  title:{color:colors.primary,fontSize:19,fontWeight:"700"},
  text:{color:colors.primary,fontSize:15,lineHeight:22},
  subdued:{color:"#435569",fontSize:14,lineHeight:21},
  warning:{color:"#774D10",fontSize:14,lineHeight:21},
  error:{color:"#9B222A",fontSize:15,lineHeight:22},
  input:{backgroundColor:colors.white,borderColor:"#708478",borderWidth:1,borderRadius:10,padding:12,color:colors.primary,minHeight:48},
  button:{backgroundColor:colors.secondaryDark,borderRadius:11,paddingHorizontal:14,paddingVertical:11,minHeight:46,alignItems:"center",justifyContent:"center"},
  flat:{backgroundColor:"#E2EDE0"},
  danger:{backgroundColor:"#901F27"},
  buttonText:{fontWeight:"700",color:colors.white,fontSize:15},
  flatText:{color:colors.primary},
  row:{flexDirection:"row",flexWrap:"wrap",gap:8},
  managementScreen:{flex:1,backgroundColor:colors.primary},
  managementHeader:{minHeight:56,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center",paddingHorizontal:52},
  managementTitle:{color:colors.white,fontSize:17,fontWeight:"700",textAlign:"center",flexShrink:1},
  managementBack:{position:"absolute",left:8,width:44,height:44,alignItems:"center",justifyContent:"center"},
  managementBody:{flex:1,backgroundColor:colors.white},
  managementContent:{width:"100%",maxWidth:640,alignSelf:"center",padding:16,paddingBottom:24,gap:14},
  managementFooter:{backgroundColor:colors.white,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"#DCE7D7"},
  managementFooterContent:{width:"100%",maxWidth:640,alignSelf:"center",paddingHorizontal:16,paddingVertical:10},
  managementPrimary:{backgroundColor:colors.primary},
});
export function Action({title,onPress,disabled,variant,testID}:{title:string;onPress:()=>void;disabled?:boolean;variant?:"flat"|"danger"|"primary";testID?:string}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} accessibilityLabel={title} testID={testID} disabled={disabled} onPress={onPress}
    style={[ui.button,variant==="flat"&&ui.flat,variant==="danger"&&ui.danger,variant==="primary"&&ui.managementPrimary,disabled&&{opacity:0.55}]}>
    <Text style={[ui.buttonText,variant==="flat"&&ui.flatText]}>{title}</Text>
  </Pressable>;
}
export function Pagination({page,next,onChange}:{page:number;next:boolean;onChange:(page:number)=>void}){
  if(page===1&&!next)return null;
  return <View style={ui.row}><Action title="Página anterior" variant="flat" disabled={page===1} onPress={()=>onChange(page-1)}/>
    <Action title="Próxima página" variant="flat" disabled={!next} onPress={()=>onChange(page+1)}/></View>;
}
export function Panel({title,children}:{title?:string;children:ReactNode}) { return <View style={ui.panel}>{title&&<Text accessibilityRole="header" style={ui.title}>{title}</Text>}{children}</View>; }
export function Field({label,...props}:TextInputProps&{label:string}) { return <View style={{gap:5}}><Text style={ui.text}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#566D63" style={ui.input} {...props}/></View>; }
export function Page({title,children,refresh,refreshing=false,back=true,management=false,footer}:{
  title:string;children:ReactNode;refresh?:()=>void;refreshing?:boolean;back?:boolean;management?:boolean;footer?:ReactNode;
}) {
  const router=useRouter();
  const canGoBack=useCanGoBack();
  if(management) return (
    <SafeAreaView style={ui.managementScreen} edges={["top","left","right"]}>
      <Header name={title} right={null} containerStyle={ui.managementHeader} titleStyle={ui.managementTitle}
        left={back ? <IconButton icon={ArrowLeft} color={colors.white} size={21} accessibilityLabel="Voltar"
          style={ui.managementBack} onPress={()=>canGoBack?router.back():router.replace("/inicio")} /> : undefined} />
      <ScrollView style={ui.managementBody} contentContainerStyle={ui.managementContent}
        keyboardShouldPersistTaps="handled" refreshControl={refresh?<RefreshControl refreshing={refreshing} onRefresh={refresh}/>:undefined}>
        {children}
      </ScrollView>
      {footer && <View style={ui.managementFooter}><View style={ui.managementFooterContent}>{footer}</View></View>}
    </SafeAreaView>
  );
  return <SafeAreaView style={ui.screen}>
    <View style={ui.header}>
      {back&&canGoBack&&<Text accessibilityRole="button" style={ui.headerAction} onPress={()=>router.back()}>Voltar</Text>}
      <View style={ui.headerTitleRow}>
        <View style={ui.headerMark}><Logo variant="mark" style={ui.headerMarkImage}/></View>
        <Text accessibilityRole="header" style={ui.headerTitle}>{title}</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled"
      refreshControl={refresh?<RefreshControl refreshing={refreshing} onRefresh={refresh}/>:undefined}>{children}</ScrollView>
  </SafeAreaView>;
}
export function Feedback({loading,error,empty,stale,retry}:{loading?:boolean;error?:Error|string|null;empty?:boolean;stale?:boolean;retry?:()=>void}) {
  return <>
    {loading&&<ActivityIndicator accessibilityLabel="Carregando" color={colors.primary}/>}
    {error&&<Panel><Text accessibilityRole="alert" style={ui.error}>{typeof error==="string"?error:error.message}</Text>{retry&&<Action title="Tentar novamente" onPress={retry} variant="flat"/>}</Panel>}
    {stale&&<Text style={ui.warning}>Dados provisórios ou pendentes de atualização.</Text>}
    {empty&&!loading&&!error&&<Text style={ui.subdued}>Sem dados para os filtros selecionados.</Text>}
  </>;
}
export function mutationError(error:unknown) { return error instanceof ApiError || error instanceof Error ? error.message : "Não foi possível concluir a operação."; }
export function value(number:number|string|null|undefined) { return number == null ? "Indisponível" : Number(number).toLocaleString("pt-BR"); }
export function stamp(at:string|null|undefined) { return at?new Date(at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}):"Indisponível"; }
export function today() { const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()); return ["year","month","day"].map(key=>parts.find(part=>part.type===key)?.value).join("-"); }
export function isDay(day:string) { if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false; const date=new Date(day+"T00:00:00Z"); return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===day&&day<=today(); }
export function shifted(day:string,days:number) { const date=new Date(day+"T00:00:00Z"); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
export function labels(status:string|undefined) { return ({NO_DATA:"Sem dados",PROVISIONAL:"Provisório",COMPLETE:"Consolidado",REVISED:"Revisado",PARTIAL:"Parcial",UNAVAILABLE:"Indisponível",ONLINE:"Conectada",OFFLINE:"Desconectada",DEGRADED:"Degradada",ERROR:"Falha",UNKNOWN:"Desconhecido",STALE:"Desatualizado",PENDING:"Pendente",EXPIRED:"Expirado",REVOKED:"Revogado",ACCEPTED:"Aceito"} as Record<string,string>)[status??""]??status??"Indisponível"; }
export function RangeFields({start,end,onStart,onEnd}:{start:string;end:string;onStart:(s:string)=>void;onEnd:(s:string)=>void}) { return <Panel title="Período">
  <Field label="Data inicial (AAAA-MM-DD)" value={start} onChangeText={onStart} maxLength={10}/>
  <Field label="Data final (AAAA-MM-DD)" value={end} onChangeText={onEnd} maxLength={10}/>
</Panel>; }
