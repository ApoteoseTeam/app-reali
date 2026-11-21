import { useEffect, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { useSession } from "../session/provider";
import { SplashScreen } from "../screens/SplashScreen/SplashScreen";
import TelaInicial from "../screens/TelaInicial/TelaInicial";

export default function Index() {
  const session = useSession();
  const router = useRouter();
  const [introComplete, setIntroComplete] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const ready = session.status !== "INITIALIZING";

  useEffect(() => {
    if (introComplete || !ready) return;
    const timer = setTimeout(() => setIntroComplete(true), imageReady ? 720 : 2400);
    return () => clearTimeout(timer);
  }, [introComplete, ready, imageReady]);

  if (!introComplete || !ready) {
    return <SplashScreen onReady={() => setImageReady(true)} error={!ready ? session.error : null} onRetry={session.retry} />;
  }
  if (session.status === "AUTHENTICATED") return <Redirect href={session.workspace?.school ? "/inicio" : "/contexto"} />;
  if (session.status === "SESSION_EXPIRED" || session.status === "ACCOUNT_DISABLED") return <Redirect href="/entrar" />;
  return <TelaInicial onEnter={() => router.push("/entrar")} />;
}
