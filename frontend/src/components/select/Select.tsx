import { useState } from "react";
import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { styles } from "./styles";

type SelectProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'default' | 'relatorio';
};

export function Select({ label, options, value, onChange, placeholder = "Selecione uma opção", variant = "default" }: SelectProps) {
  const [visible, setVisible] = useState(false);

  function handleSelect(option: string) {
    onChange(option);
    setVisible(false);
  }

  const isRelatorio = variant === 'relatorio';

  return (
    <View style={styles.container}>
      {!isRelatorio && <Text style={styles.label}>{label}</Text>}

      <Pressable
        style={[styles.input, isRelatorio && styles.inputRelatorio]}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}, ${value}` : label}
      >
        <Text
          style={[
            value ? styles.value : styles.placeholder,
            isRelatorio && styles.textoRelatorio,
          ]}
        >
          {value || placeholder}
        </Text>

        <ChevronDown size={20} color={isRelatorio ? '#FFFFFF' : '#64748B'} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={styles.modal}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.title}>{label}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.optionText}>{item}</Text>

                  {value === item && (
                    <Check size={20} color="#2563EB" />
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}