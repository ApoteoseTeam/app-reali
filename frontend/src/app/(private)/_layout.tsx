import { Stack } from "expo-router";
import { useSession } from "../../session/provider";

export default function Private(){
  const session=useSession();
  return <Stack screenOptions={{headerShown:false}}>
    <Stack.Screen name="contexto"/>
    <Stack.Protected guard={Boolean(session.workspace?.school)&&!session.selecting}><Stack.Screen name="(school)" /></Stack.Protected>
  </Stack>;
}
