import {View, Text, Pressable, Modal, FlatList } from "react-native";
import { style } from "./style"
import { IconButton } from '../IconButton/IconButton';


import {
  Bell,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react-native';

type SelectProps = {
  name: string;
};

export function Header({name}: SelectProps) {

  return (
    <View style={style.container}>
      <View style={style.container_name}>
        <Text style={style.pagename}>{ name }</Text>
      </View> 
      <View style={style.icon}>
        <IconButton
          icon={Bell}
          onPress={() => console.log('Notificações')}
        />
      </View>     
    </View>

  );
}
