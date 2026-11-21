import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';

import { Button } from '../../components/Button/Button';
import { DateField } from '../../components/DateField/DateField';
import { Header } from '../../components/header/header';
import { IconButton } from '../../components/IconButton/IconButton';
import { Select } from '../../components/select/Select';
import { styles } from './styles';

const REFEICOES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar'];

const INGREDIENTES = [
    { id: 'arroz', nome: 'Arroz', medida: 'pacote de 5 kg' },
    { id: 'feijao', nome: 'Feijão', medida: 'pacote de 1 kg' },
    { id: 'omelete', nome: 'Omelete', medida: 'ovo (unidade)' },
    { id: 'macarrao', nome: 'Macarrão', medida: 'pacote de 500 g' },
    { id: 'cenoura', nome: 'Cenoura', medida: 'unidade' },
];

const DATA_INICIAL = '2026-11-09';
const REFEICAO_INICIAL = 'Almoço';
const INGREDIENTES_INICIAIS = ['arroz', 'feijao', 'omelete'];

type Cardapio = {
    data: string;
    refeicao: string;
    ingredienteIds: string[];
};

type AdicionarCardapioProps = {
    onSalvar?: (cardapio: Cardapio) => void;
    onVoltar?: () => void;
};

export default function AdicionarCardapio({
    onSalvar,
    onVoltar,
}: AdicionarCardapioProps = {}) {
    const [data, setData] = useState(DATA_INICIAL);
    const [refeicao, setRefeicao] = useState(REFEICAO_INICIAL);
    const [ingredienteIds, setIngredienteIds] = useState(INGREDIENTES_INICIAIS);
    const [seletorAberto, setSeletorAberto] = useState(false);

    const selecionados = INGREDIENTES.filter((item) =>
        ingredienteIds.includes(item.id)
    );
    const disponiveis = INGREDIENTES.filter((item) =>
        !ingredienteIds.includes(item.id)
    );
    const podeSalvar = Boolean(onSalvar && data && refeicao && ingredienteIds.length);

    function adicionarIngrediente(id: string) {
        setIngredienteIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
        setSeletorAberto(false);
    }

    function removerIngrediente(id: string) {
        setIngredienteIds((ids) => ids.filter((itemId) => itemId !== id));
    }

    function cancelar() {
        if (onVoltar) {
            onVoltar();
            return;
        }

        setData(DATA_INICIAL);
        setRefeicao(REFEICAO_INICIAL);
        setIngredienteIds(INGREDIENTES_INICIAIS);
    }

    return (
        <View style={styles.tela}>
            <Header
                name="Adicionar cardápio"
                containerStyle={styles.cabecalho}
                titleStyle={styles.titulo}
                left={
                    <IconButton
                        icon={ArrowLeft}
                        size={22}
                        color="#FFFFFF"
                        accessibilityLabel="Voltar"
                        onPress={cancelar}
                        style={styles.voltar}
                    />
                }
                right={<View style={styles.espacoCabecalho} />}
            />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}>
                <DateField label="Data" value={data} onChange={setData} />

                <Select
                    label="Refeição"
                    options={REFEICOES}
                    value={refeicao}
                    onChange={setRefeicao}
                />

                <View style={styles.lista}>
                    <Text accessibilityRole="header" style={styles.rotulo}>
                        Ingredientes do cardápio
                    </Text>

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
                </View>
            </ScrollView>

            <View style={styles.rodape}>
                <Button
                    label="Salvar cardápio"
                    accessibilityRole="button"
                    disabled={!podeSalvar}
                    onPress={() => onSalvar?.({ data, refeicao, ingredienteIds })}
                    style={[styles.botao, styles.preenchido, !podeSalvar && styles.desabilitado]}
                />

                <Button
                    label="Cancelar"
                    accessibilityRole="button"
                    onPress={cancelar}
                    style={[styles.botao, styles.contorno]}
                    textStyle={styles.textoAzul}
                />
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
        </View>
    );
}