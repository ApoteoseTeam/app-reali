import { Pressable, Text, View } from 'react-native';
import { Bell, ChevronLeft } from 'lucide-react-native';

import { IconButton } from '../iconbuttons/IconButton';
import { colors } from '../../theme/colors';
import { style } from './style';

type HeaderProps = {
  name: string;
  variant?: 'default' | 'back';
  onBack?: () => void;
};

export function Header({
  name,
  variant = 'default',
  onBack,
}: HeaderProps) {
  if (variant === 'back') {
    return (
      <View style={[style.container, style.backContainer]}>
        <Pressable
          onPress={onBack}
          disabled={!onBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          accessibilityState={{ disabled: !onBack }}
          style={style.backButton}
          hitSlop={8}
        >
          <ChevronLeft
            size={24}
            color={colors.textSecondary}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          style={style.backTitle}
        >
          {name}
        </Text>
      </View>
    );
  }

  return (
    <View style={style.container}>
      <View style={style.container_name}>
        <Text style={style.pagename}>{name}</Text>
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