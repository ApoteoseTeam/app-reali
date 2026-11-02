import { View, Text, ScrollView } from 'react-native'
import { styles } from '../formulario-resumo/style'
import { Header } from '../../components/header/header'
import { Check } from 'lucide-react-native';
import { Banner } from '../../components/Banner/Banner';
import { Input } from '../../components/input';
import { Button } from '../../components/button';



export default function FormularioResumo() {

    const preparacoes = [
        {
            nome: "Arroz",
            preparado: "10,0 kg",
            sobra: "1,2 kg",
            porcentagem: "12%"
        },
        {
            nome: "Feijão",
            preparado: "8,0 kg",
            sobra: "0,8 kg",
            porcentagem: "10%"
        },
        {
            nome: "Carne",
            preparado: "12,0 kg",
            sobra: "0,5 kg",
            porcentagem: "4%"
        },
        {
            nome: "Salada",
            preparado: "5,0 kg",
            sobra: "1,0 kg",
            porcentagem: "20%"
        },
        {
            nome: "Fruta",
            preparado: "6,0 kg",
            sobra: "1,0 kg",
            porcentagem: "17%"
        },
    ]

    return (
        <View style={styles.mainWrapper}>
            <View style={styles.headerContainer}>
                <Header name="Formulário-Cantina" />
            </View>

            <ScrollView style={styles.container}>
                <View style={styles.topContent}>

                    <View style={styles.stepper}>

                        <View style={styles.step}>
                            <View style={styles.stepCircle}>
                                <Check size={18} color="#FFFFFF" />
                            </View>
                            <Text style={styles.stepText}>Refeição</Text>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.step}>
                            <View style={styles.stepCircle}>
                                <Check size={18} color="#FFFFFF" />
                            </View>
                            <Text style={styles.stepText}>Alimentos</Text>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.step}>
                            <View style={styles.stepCircle}>
                                <Check size={18} color="#FFFFFF" />
                            </View>
                            <Text style={styles.stepText}>Quantidade</Text>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.step}>
                            <View style={styles.stepCircle}>
                                <View style={styles.stepCircleCurrent}>
                                    <Text style={styles.stepNumberCurrent}>4</Text>
                                </View>
                            </View>
                            <Text style={styles.stepText}>Finalizar</Text>
                        </View>

                    </View>
                </View>

                <View style={styles.banner}>
                    <Banner mensagem="16/10/2026 · Almoço" />

                </View>

                <View style={styles.input}>
                    <Text style={styles.title}>Refeições servidas (obrigatório)</Text>
                    <Input />
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableText}>Preparação</Text>
                        <Text style={styles.tableTop}>Preparado</Text>
                        <Text style={styles.tableTop}>Sobra</Text>
                        <Text style={styles.tableTop}>%</Text>
                    </View>

                    {preparacoes.map((item, index) => (
                        <View key={index} style={styles.tableRow}>

                            <Text style={styles.tableName}>
                                {item.nome}
                            </Text>
                            <Text style={styles.tableCell}>
                                {item.preparado}
                            </Text>
                            <Text style={styles.tableCell}>
                                {item.sobra}
                            </Text>
                            <Text style={styles.tableCell}>
                                {item.porcentagem}
                            </Text>
                        </View>

                    ))}


                    <View style={styles.totalRow}>

                        <Text style={styles.totalName}>Total</Text>
                        <Text style={styles.totalCell}>41,0 kg</Text>
                        <Text style={styles.totalCell}>4,5 kg</Text>
                        <Text style={styles.totalCell}>11%</Text>
                    </View>
                </View>

                <View style={styles.resumoCard}>
                    <Text style={styles.resumoValor}>
                        25 g por refeição
                    </Text>

                    <Text style={styles.resumoDescricao}>
                        4,5 kg de sobra • 180 refeições
                    </Text>
                </View>

                <Banner
                    tipo="alerta"
                    titulo="Atenção"
                    mensagem="Confira: a Salada tem 20% de sobra, acima das outras preparações."
                />
                <View style={styles.button}>
                    <Button label="Voltar e editar" style={styles.backgroundButton} textStyle={styles.textStyle} />
                    <Button label="Salvar Registro" style={styles.widthButton} />
                </View>
            </ScrollView>
        </View>
    )
}