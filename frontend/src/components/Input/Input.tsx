import { TextInput, TextInputProps } from "react-native"
import { styles } from "./styles";

type InputProps = TextInputProps;

export const Input = ({ style, ...rest }: InputProps) => {
  return (
    <TextInput
      style={[styles.input, style]}
      {...rest}
    />
  )
}