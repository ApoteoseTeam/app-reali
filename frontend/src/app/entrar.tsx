import { Redirect, useRouter } from "expo-router";
import Login from "../screens/loginCadastro/loginCadastro";
import { SplashScreen } from "../screens/SplashScreen/SplashScreen";
import { useSession } from "../session/provider";

export default function Entrar() {
  const session = useSession();
  const router = useRouter();
  if (session.status === "INITIALIZING") return <SplashScreen error={session.error} onRetry={session.retry} />;
  if (session.status === "AUTHENTICATED") return <Redirect href={session.workspace?.school ? "/inicio" : "/contexto"} />;
  return <Login onLogin={session.signIn} onReset={() => router.push("/recuperar")} sessionError={session.error} />;
}
