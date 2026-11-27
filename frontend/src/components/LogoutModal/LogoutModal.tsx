import { Modal, View, Text } from 'react-native';
import { LogOut } from 'lucide-react-native';

import { Button } from '../Button/Button';
import { colors } from '../../theme/colors';
import { styles } from './styles';

type LogoutModalProps = {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export const LogoutModal = ({
    visible,
    onCancel,
    onConfirm,
}: LogoutModalProps) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <LogOut
                            size={24}
                            color={colors.error}
                        />
                    </View>
                    <Text style={styles.title}>
                        Sair da conta?
                    </Text>

                    <Text style={styles.description}>
                        Você precisará entrar de novo para ver seus
                        planejamentos e relatórios.
                    </Text>
                    <View style={styles.actions}>
                        <Button
                            label="Cancelar"
                            style={styles.cancelButton}
                            textStyle={styles.cancelButtonText}
                            onPress={onCancel}
                        />

                        <Button
                            label="Sair"
                            style={styles.confirmButton}
                            textStyle={styles.confirmButtonText}
                            onPress={onConfirm}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};