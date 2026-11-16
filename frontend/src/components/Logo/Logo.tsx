import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

export function Logo({ style}: { style?: StyleProp<ImageStyle>}) {
  return (
    <Image
      source={require("../../assets/logo-reali.png")}
      style={[styles.logo, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 200,
    height: 200,
  },
});