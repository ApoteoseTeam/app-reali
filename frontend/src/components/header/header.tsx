import { View, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { style } from "./styles"
import type { ReactNode } from 'react';
import { NotificationBell } from '../../components/NotificationBell/NotificationBell';
import { Logo } from '../Logo/Logo';

type HeaderProps = {
  name: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};



export function Header({ name, left, right, containerStyle, titleStyle }: HeaderProps) {

  return (
    <View style={containerStyle ?? style.container}>
      {left}

      <View style={[style.titleGroup, left == null && style.container_name]}>
        <View style={style.logoFrame}><Logo variant="mark" style={style.logo} /></View>
        <Text accessibilityRole="header" style={titleStyle ?? style.pagename}>{name}</Text>
      </View>
      {right === undefined ? (
        <View style={style.icon}>
          <NotificationBell />
        </View>
      ) : (
        right
      )}
    </View>

  );
}
