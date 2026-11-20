import { Redirect, useRouter } from "expo-router";
import Login from "../screens/loginCadastro/loginCadastro";
import { useSession } from "../session/provider";
import { Feedback, Page } from "../features/ui";

export default function Index(){
  const session=useSession();
  const router=useRouter();
  if(session.status==="INITIALIZING")return <Page title="Reali" back={false}><Feedback loading={!session.error} error={session.error} retry={session.retry}/></Page>;
  if(session.status==="AUTHENTICATED")return <Redirect href={session.workspace?.school?"/inicio":"/contexto"}/>;
  return <Login onLogin={session.signIn} onReset={()=>router.push("/recuperar")} sessionError={session.error}/>;
}
