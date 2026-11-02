
import { View, Text } from "react-native";
import styles from "./styles";

interface StepperProps {
  currentStep: number;
}

const steps = [
  "Dados de Refeição",
  "Alimentos",
  "Quantidades",
  "Finalizar",
];

export function Stepper({ currentStep }: StepperProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <View key={step} style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  (isActive || isCompleted) && styles.activeCircle,
                ]}
              >
                <Text style={styles.circleText}>
                  {isCompleted ? "✓" : stepNumber}
                </Text>
              </View>

              <Text style={styles.stepLabel}>
                {step}
              </Text>

              {index !== steps.length - 1 && (
                <View style={styles.connector} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
