import { View } from "react-native";
import { roleNames, type Grant, type School } from "../api/reali";
import { Action, ui } from "./ui";

const roles=Object.keys(roleNames).filter(role=>role!=="ADMIN");
export const blank:Grant={all_schools_access:false,school_ids:[]};
export function Roles({role,onChange}:{role:string;onChange:(role:string)=>void}){
  return <View style={ui.row}>{roles.map(option=><Action key={option} title={roleNames[option]} variant={role===option?undefined:"flat"} onPress={()=>onChange(option)}/>)}</View>;
}
export function SchoolGrant({schools,grant,update,all}:{schools:School[];grant:Grant;update:(value:Grant)=>void;all:boolean}){
  return <>
    {all&&<Action title={grant.all_schools_access?"Todas as escolas selecionadas":"Autorizar todas as escolas"} variant={grant.all_schools_access?undefined:"flat"} onPress={()=>update({school_ids:[],all_schools_access:!grant.all_schools_access})}/>}
    {!grant.all_schools_access&&<View style={ui.row}>{schools.map(school=><Action key={school.id} title={school.name} variant={grant.school_ids.includes(school.id)?undefined:"flat"}
      onPress={()=>update({all_schools_access:false,school_ids:grant.school_ids.includes(school.id)?grant.school_ids.filter(id=>id!==school.id):[...grant.school_ids,school.id]})}/>)}</View>}
  </>;
}
