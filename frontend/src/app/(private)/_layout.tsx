import { Stack, usePathname } from "expo-router";
import { View } from "react-native";
import { BottomTabs } from "../../components/BottomTabs/BottomTabs";
import { useSession } from "../../session/provider";

export default function Private(){
  const session=useSession();
  const pathname = usePathname();
  const schoolReady = Boolean(session.workspace?.school) && !session.selecting;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="contexto" />
        <Stack.Protected guard={schoolReady}><Stack.Screen name="(school)" /></Stack.Protected>
      </Stack>
      {schoolReady && pathname !== "/inicio" && <BottomTabs />}
    </View>
  );
}
