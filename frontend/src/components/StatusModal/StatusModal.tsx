
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
} from "react-native";

import { Check, CircleAlert } from "lucide-react-native";

import { Button } from "../Button/Button";
import { styles } from "./styles";

export type StatusPlanejamento = "loading" | "success" | "error";

type StatusModalProps = {
  visible: boolean;
  status: StatusPlanejamento;
  totalAlunos?: number;
  dataRefeicao?: string;
  onClose: () => void;
  onRetry: () => void;
  onViewHistory: () => void;
};

export function StatusModal({
  visible,
  status,
  totalAlunos,
  dataRefeicao,
  onClose,
  onRetry,
  onViewHistory,
}: StatusModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>


          {status === "loading" && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <ActivityIndicator
                  size="large"
                  color="#315F52"
                />
              </View>

              <Text style={styles.title}>
                Salvando planejamento...
              </Text>

              <Text style={styles.description}>
                Aguarde enquanto registramos os dados
                da refeição.
              </Text>

              <Text style={styles.loadingText}>
                Aguarde...
              </Text>
            </View>
          )}


          {status === "success" && (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Check size={26} color="#315F52" />
              </View>

              <Text style={styles.title}>
                Planejamento salvo
              </Text>

              <Text style={styles.description}>
                {totalAlunos !== undefined
                  ? `Preparo planejado para ${totalAlunos} alunos`
                  : "Planejamento salvo com sucesso"}

                {dataRefeicao ? ` · ${dataRefeicao}` : ""}
              </Text>

              <View style={styles.buttonContainer}>
                <Button
                  label="Ver no histórico"
                  onPress={onViewHistory}
                  style={styles.primaryButton}
                />

                <Button
                  label="Fechar"
                  onPress={onClose}
                  style={styles.secondaryButton}
                  textStyle={styles.secondaryButtonText}
                />
              </View>
            </View>
          )}

          
          {status === "error" && (
            <View style={styles.content}>
              <View
                style={[
                  styles.iconContainer,
                  styles.errorIconContainer,
                ]}
              >
                <CircleAlert
                  size={26}
                  color="#C74730"
                />
              </View>

              <Text style={styles.title}>
                Não foi possível salvar
              </Text>

              <Text style={styles.description}>
                Ocorreu um erro ao salvar o planejamento.
                Seus dados continuam preenchidos.
              </Text>

              <View style={styles.buttonContainer}>
                <Button
                  label="Tentar novamente"
                  onPress={onRetry}
                  style={styles.primaryButton}
                />

                <Button
                  label="Fechar"
                  onPress={onClose}
                  style={styles.secondaryButton}
                  textStyle={styles.secondaryButtonText}
                />
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}
