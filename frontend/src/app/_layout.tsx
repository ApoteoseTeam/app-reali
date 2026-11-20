import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../session/provider";
import { NotificationsProvider } from "../notifications/provider";

function Routes(){
  const session=useSession();
  return <Stack screenOptions={{headerShown:false}}>
    <Stack.Screen name="index"/>
    <Stack.Screen name="ativar"/>
    <Stack.Screen name="recuperar"/>
    <Stack.Protected guard={session.status==="AUTHENTICATED"}><Stack.Screen name="(private)"/></Stack.Protected>
  </Stack>;
}

export default function Layout(){return <SafeAreaProvider><SessionProvider><NotificationsProvider><StatusBar style="auto"/><Routes/></NotificationsProvider></SessionProvider></SafeAreaProvider>;}
