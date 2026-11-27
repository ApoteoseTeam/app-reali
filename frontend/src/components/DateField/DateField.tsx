import { useState } from 'react';
import {Modal, Pressable, ScrollView, Text, View,} from 'react-native';

import { Calendar, LocaleConfig } from 'react-native-calendars';
import { CalendarDays } from 'lucide-react-native';

import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import { colors } from '../../theme/colors';
import { styles } from './styles';

LocaleConfig.locales['pt-BR'] = {
    monthNames: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ],
    monthNamesShort: [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ],
    dayNames: [
        'Domingo', 'Segunda-feira', 'Terça-feira',
        'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado',
    ],
    dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    today: 'Hoje',
};

LocaleConfig.defaultLocale = 'pt-BR';

type DateFieldProps = {
    value: string;
    onChange: (data: string) => void;
    label?: string;
};

export function DateField({
    value,
    onChange,
    label = 'Data da coleta',
}: DateFieldProps) {
    const [aberto, setAberto] = useState(false);

    // O componente recebe a data como AAAA-MM-DD.
    const dataFormatada = value
        ? value.split('-').reverse().join('/')
        : '';

    function fecharCalendario() {
        setAberto(false);
    }

    function selecionarData(data: string) {
        onChange(data);
        fecharCalendario();
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            <Pressable
                style={styles.field}
                onPress={() => setAberto(true)}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${dataFormatada || 'nenhuma data selecionada'
                    }. Abrir calendário`}
                accessibilityState={{ expanded: aberto }}
            >
                <CalendarDays
                    size={18}
                    color={colors.text}
                    accessible={false}
                />

                <View
                    style={styles.areaInput}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    aria-hidden
                >
                    <Input
                        value={dataFormatada}
                        placeholder="Selecione a data"
                        placeholderTextColor="#565656"
                        editable={false}
                        accessible={false}
                        style={styles.input}
                    />
                </View>
            </Pressable>

            <Modal
                visible={aberto}
                transparent
                animationType="fade"
                onRequestClose={fecharCalendario}
            >
                <View style={styles.modalBackground}>
                    <ScrollView
                        style={styles.window}
                        contentContainerStyle={styles.windowContent}
                        accessibilityViewIsModal
                    >
                        <Text style={styles.title} accessibilityRole="header">
                            {label}
                        </Text>

                        {aberto ? (
                            <Calendar
                                initialDate={value || undefined}
                                onDayPress={(dia) => selecionarData(dia.dateString)}
                                markedDates={
                                    value
                                        ? {
                                            [value]: {
                                                selected: true,
                                                selectedColor: colors.secondary,
                                            },
                                        }
                                        : {}
                                }
                                theme={{
                                    arrowColor: colors.secondary,
                                    todayTextColor: colors.secondary,
                                }}
                            />
                        ) : null}

                        <Button
                            label="Cancelar"
                            onPress={fecharCalendario}
                            accessibilityRole="button"
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}