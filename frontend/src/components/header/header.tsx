import { View, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { style } from "./styles"
import { IconButton } from '../IconButton/IconButton';
import type { ReactNode } from 'react';

import {
  Bell,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react-native';

type HeaderProps = {
  name: string;
  onTitlePress?: () => void;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};



export function Header({ name, left, right, containerStyle, titleStyle, onTitlePress }: HeaderProps) {

  const title = (
    <Text accessibilityRole={onTitlePress ? "button" : "header"} accessibilityHint={onTitlePress ? "Voltar à tela inicial" : undefined} onPress={onTitlePress} style={titleStyle ?? style.pagename}>{name}</Text>
  )

  return (
    <View style={containerStyle ?? style.container}>
      {left}

      {left == null ? (
        <View style={style.container_name}>{title}</View>
      ) : (
        title
      )}
      {right === undefined ? (
        <View style={style.icon}>
          <IconButton
            icon={Bell}
            accessibilityLabel="Notificações"
            onPress={() => console.log('Notificações')}
          />
        </View>
      ) : (
        right
      )}
    </View>

  );
}
