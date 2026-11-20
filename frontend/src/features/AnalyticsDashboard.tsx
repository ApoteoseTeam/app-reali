import Home from "../screens/HomeGestao/Home";
import HomeCozinha from "../screens/HomeCozinha/HomeCozinha";
import { useRemote } from "../hooks/useRemote";
import { api, useSession } from "../session/provider";

const configured=Number(process.env.EXPO_PUBLIC_DASHBOARD_INTERVAL_MS??0);
const interval=Number.isFinite(configured)&&configured>0?Math.max(60000,configured):0;

export default function Dashboard(){
  const session=useSession();
  const workspace=session.workspace!;
  const data=useRemote("dashboard",signal=>api.dashboard(workspace.scope,{school:workspace.school?.id},signal),true,interval);
  const shared={name:session.me?.user.full_name.split(" ")[0]||"Reali",school:workspace.school?.name??workspace.organization.name,
    data:data.data,loading:data.loading,error:data.error,refresh:data.refresh};
  return workspace.member.role==="COOK"?<HomeCozinha {...shared}/>:<Home {...shared} can={session.can}/>;
}
