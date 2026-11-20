import { View } from "react-native";
import { mealTypes, type MealType } from "../../api/reali";
import { Action, Field, Panel, ui } from "../../features/ui";

type Props={
  mode:"service"|"schedule";
  type:MealType;
  time:string;
  weekdays:number[];
  onType:(type:MealType)=>void;
  onTime:(value:string)=>void;
  onDays:(days:number[])=>void;
  onSave:()=>void;
  onClose:()=>void;
  disabled:boolean;
};

export default function MealForm({mode,type,time,weekdays,onType,onTime,onDays,onSave,onClose,disabled}:Props){
  return <Panel title={mode==="service"?"Novo serviço":"Nova programação"}>
    <View style={ui.row}>{(Object.keys(mealTypes) as MealType[]).map(item=><Action key={item} title={mealTypes[item]} variant={item===type?undefined:"flat"} onPress={()=>onType(item)}/>)}</View>
    <Field label="Horário (HH:MM)" value={time} onChangeText={onTime} maxLength={5}/>
    {mode==="schedule"&&<View style={ui.row}>{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((day,index)=><Action key={day} title={day}
      variant={weekdays.includes(index+1)?undefined:"flat"} onPress={()=>onDays(weekdays.includes(index+1)?weekdays.filter(item=>item!==index+1):[...weekdays,index+1])}/>)}</View>}
    <Action title="Salvar" disabled={disabled} onPress={onSave}/>
    <Action title="Voltar à lista" variant="flat" onPress={onClose}/>
  </Panel>;
}
