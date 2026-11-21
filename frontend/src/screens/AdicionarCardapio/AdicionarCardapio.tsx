import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mealTypes, type MealType } from '../../api/reali';
import { Button } from '../../components/Button/Button';
import { DateField } from '../../components/DateField/DateField';
import { Header } from '../../components/header/header';
import { IconButton } from '../../components/IconButton/IconButton';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/select/Select';
import { Action, Feedback, ui } from '../../features/ui';
import { styles } from './styles';

const REFEICOES = Object.keys(mealTypes) as MealType[];
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const INGREDIENTES = [
    { id: 'arroz', nome: 'Arroz', medida: 'pacote de 5 kg' },
    { id: 'feijao', nome: 'Feijão', medida: 'pacote de 1 kg' },
    { id: 'omelete', nome: 'Omelete', medida: 'ovo (unidade)' },
    { id: 'macarrao', nome: 'Macarrão', medida: 'pacote de 500 g' },
    { id: 'cenoura', nome: 'Cenoura', medida: 'unidade' },
];

type AdicionarCardapioProps = {
    mode: 'service' | 'schedule';
    data: string;
    type: MealType;
    time: string;
    weekdays: number[];
    name: string;
    onDate: (date: string) => void;
    onType: (type: MealType) => void;
    onTime: (time: string) => void;
    onDays: (days: number[]) => void;
    onName: (name: string) => void;
    onSave: () => void;
    onClose: () => void;
    disabled: boolean;
    loading: boolean;
    error: string | null;
};

export default function AdicionarCardapio({
    mode, data, type, time, weekdays, name, onDate, onType, onTime, onDays, onName, onSave, onClose, disabled, loading, error,
}: AdicionarCardapioProps) {
    const [ingredienteIds, setIngredienteIds] = useState<string[]>([]);
    const [seletorAberto, setSeletorAberto] = useState(false);
    const semanal = mode === 'schedule';

    const selecionados = INGREDIENTES.filter((item) =>
        ingredienteIds.includes(item.id)
    );
    const disponiveis = INGREDIENTES.filter((item) =>
        !ingredienteIds.includes(item.id)
    );

    function adicionarIngrediente(id: string) {
        setIngredienteIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
        setSeletorAberto(false);
    }

    function removerIngrediente(id: string) {
        setIngredienteIds((ids) => ids.filter((itemId) => itemId !== id));
    }

    return (
        <SafeAreaView style={ui.managementScreen} edges={["top", "left", "right"]}>
            <Header
                name={semanal ? 'Nova programação' : 'Adicionar cardápio'}
                containerStyle={styles.cabecalho}
                titleStyle={styles.titulo}
                left={
                    <IconButton
                        icon={ArrowLeft}
                        size={22}
                        color="#FFFFFF"
                        accessibilityLabel="Voltar"
                        onPress={() => { if (!loading) onClose(); }}
                        style={styles.voltar}
                    />
                }
                right={<View style={styles.espacoCabecalho} />}
            />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}>
                {!semanal && <DateField label="Data" value={data} onChange={onDate} />}
                {semanal && <View style={styles.lista}>
                    <Text style={styles.rotulo}>Nome da programação</Text>
                    <Input accessibilityLabel="Nome da programação" value={name} onChangeText={onName} style={styles.campo}
                        maxLength={120} placeholder="Ex. Almoço da semana" editable={!loading} />
                </View>}

                <Select
                    label="Refeição"
                    options={REFEICOES.map(refeicao => mealTypes[refeicao])}
                    value={mealTypes[type]}
                    onChange={label => {
                        const refeicao = REFEICOES.find(value => mealTypes[value] === label);
                        if (refeicao) onType(refeicao);
                    }}
                />

                <View style={styles.lista}>
                    <Text style={styles.rotulo}>Horário (HH:MM)</Text>
                    <Input accessibilityLabel="Horário (HH:MM)" value={time} onChangeText={onTime} style={styles.campo}
                        maxLength={5} placeholder="12:00" editable={!loading} />
                </View>
                {semanal ? <View style={styles.lista}>
                    <Text style={styles.rotulo}>Dias da semana</Text>
                    <View style={ui.row}>
                        {DIAS.map((day, index) => {
                            const number = index + 1;
                            const selected = weekdays.includes(number);
                            return <Action key={day} title={day} variant={selected ? undefined : 'flat'} disabled={loading}
                                onPress={() => onDays(selected ? weekdays.filter(value => value !== number) : [...weekdays, number])} />;
                        })}
                    </View>
                </View> : <View style={styles.lista}>
                    <Text accessibilityRole="header" style={styles.rotulo}>
                        Rascunho de ingredientes
                    </Text>
                    <Text style={styles.medida}>Os ingredientes ficam no rascunho desta tela.</Text>

                    {selecionados.map(({ id, nome, medida }) => (
                        <View key={id} style={styles.ingrediente}>
                            <View style={styles.textosIngrediente}>
                                <Text style={styles.nome}>{nome}</Text>
                                <Text style={styles.medida}>Medida padrão: {medida}</Text>
                            </View>

                            <IconButton
                                icon={Trash2}
                                color="#B92D23"
                                size={18}
                                accessibilityLabel={`Remover ${nome}`}
                                onPress={() => removerIngrediente(id)}
                                style={styles.remover}
                            />
                        </View>
                    ))}

                    <Button
                        label="+ Adicionar ingredientes"
                        accessibilityRole="button"
                        disabled={disponiveis.length === 0}
                        onPress={() => setSeletorAberto(true)}
                        style={[
                            styles.botao,
                            styles.contorno,
                            disponiveis.length === 0 && styles.desabilitado,
                        ]}
                        textStyle={styles.textoAzul}
                    />
                </View>}
                <Feedback loading={loading} error={error} />
            </ScrollView>

            <View style={ui.managementFooter}>
                <View style={[ui.managementFooterContent, styles.rodape]}>
                    <Button
                        label={semanal ? 'Salvar programação' : 'Salvar serviço'}
                        accessibilityRole="button"
                        disabled={disabled}
                        onPress={onSave}
                        style={[styles.botao, styles.preenchido, disabled && styles.desabilitado]}
                    />
                    <Button
                        label="Cancelar"
                        accessibilityRole="button"
                        disabled={loading}
                        onPress={onClose}
                        style={[styles.botao, styles.contorno]}
                        textStyle={styles.textoAzul}
                    />
                </View>
            </View>

            <Modal
                visible={seletorAberto}
                transparent
                animationType="fade"
                onRequestClose={() => setSeletorAberto(false)}
            >
                <View style={styles.fundoModal}>
                    <View style={styles.modal} accessibilityViewIsModal>
                        <Text accessibilityRole="header" style={styles.rotulo}>
                            Escolher ingrediente
                        </Text>

                        <FlatList
                            data={disponiveis}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => adicionarIngrediente(item.id)}
                                    style={styles.opcao}
                                >
                                    <Text style={styles.nome}>{item.nome}</Text>
                                    <Text style={styles.medida}>{item.medida}</Text>
                                </Pressable>
                            )}
                        />

                        <Button
                            label="Fechar"
                            accessibilityRole="button"
                            onPress={() => setSeletorAberto(false)}
                            style={[styles.botao, styles.contorno]}
                            textStyle={styles.textoAzul}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
