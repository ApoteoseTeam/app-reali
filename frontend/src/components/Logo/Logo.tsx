import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

type LogoProps = { style?: StyleProp<ImageStyle>; variant?: "full" | "white" | "mark" };

export function Logo({ style, variant = "full" }: LogoProps) {
  return (
    <Image
      accessible
      accessibilityLabel="Reali"
      source={variant === "mark" ? require("../../assets/reali-header-mark.png") : require("../../assets/logo-reali.png")}
      style={[styles.logo, variant === "white" && styles.white, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 200,
    height: 200,
  },
  white: { tintColor: "#FFFFFF" },
});
