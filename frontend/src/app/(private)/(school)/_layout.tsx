import { Stack } from "expo-router";
import { useSession } from "../../../session/provider";

export default function ProtectedWorkspace(){
  const session=useSession();
  const can=session.can;
  return <Stack key={session.workspace?.key} screenOptions={{headerShown:false}}>
    <Stack.Screen name="inicio"/>
    <Stack.Screen name="perfil"/>
    <Stack.Screen name="notificacoes"/>
    <Stack.Screen name="notificacao"/>
    <Stack.Screen name="preferencias-notificacoes"/>
    <Stack.Protected guard={can("indicators")}><Stack.Screen name="relatorio"/><Stack.Screen name="historico"/></Stack.Protected>
    <Stack.Protected guard={can("meal_history")}><Stack.Screen name="merenda"/><Stack.Screen name="servico"/></Stack.Protected>
    <Stack.Protected guard={can("raw_counts")}><Stack.Screen name="contagens"/></Stack.Protected>
    <Stack.Protected guard={can("camera_status")}><Stack.Screen name="cameras"/><Stack.Screen name="camera"/></Stack.Protected>
    <Stack.Protected guard={can("staff")}><Stack.Screen name="funcionarios"/><Stack.Screen name="funcionario"/></Stack.Protected>
    <Stack.Protected guard={can("realinova_full")||can("realinova_limited")}><Stack.Screen name="realinova"/><Stack.Screen name="conversa"/></Stack.Protected>
  </Stack>;
}
