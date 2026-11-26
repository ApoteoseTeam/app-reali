import { View, Text, ScrollView } from "react-native"
import { styles } from "./styles"
import { useState } from "react"

import { Header } from "../../components/Header/Header"
import { Card } from "../../components/Card/Card"
import { Kpicard } from "../../components/KpiCard/KpiCard"
import { Select } from "../../components/Select/Select"
import { PeriodSelector } from "../../components/PeriodSelector/PeriodSelector"
import { Button } from "../../components/Button/Button"
import { BottomTabs } from "../../components/BottomTabs/BottomTabs"


const planejamentos = [
    {
        id: 1,
        data: "09/11",
        dataCompleta: "2026-11-09",
        refeicao: "Almoço",
        presentes: 400,
        preparo: 360,
        sobra: "Sobra não informada",
    },
    {
        id: 2,
        data: "06/11",
        dataCompleta: "2026-11-06",
        refeicao: "Almoço",
        presentes: 145,
        preparo: 160,
        sobra: "Sobra registrada: 1,2 kg",
    },
    {
        id: 3,
        data: "05/11",
        dataCompleta: "2026-11-05",
        refeicao: "Almoço",
        presentes: 152,
        preparo: 168,
        sobra: "Sobra não informada",
    },

]

export default function Historico() {

    const [refeicaoSelecionada, setRefeicaoSelecionada] =
        useState("Almoço");

    const [semana, setSemana] = useState(0);


    const dataSemana = new Date();

    dataSemana.setDate(
        dataSemana.getDate() + semana * 7
    );


    const inicioSemana = new Date(dataSemana);

    const diaSemana = (inicioSemana.getDay() + 6) % 7;

    inicioSemana.setDate(
        inicioSemana.getDate() - diaSemana
    );

    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);

    fimSemana.setDate(
        fimSemana.getDate() + 6
    );

    fimSemana.setHours(23, 59, 59, 999);

    const formatarData = (data: Date) => {
        return data.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
        });
    };

    const periodoFormatado =
        `${formatarData(inicioSemana)} a ${formatarData(fimSemana)}`;

    const planejamentosFiltrados = planejamentos.filter(
        (planejamento) => {
            const [ano, mes, dia] = planejamento.dataCompleta.split("-").map(Number);

            const dataPlanejamento = new Date(ano, mes - 1, dia);

            return (
                planejamento.refeicao === refeicaoSelecionada &&
                dataPlanejamento >= inicioSemana &&
                dataPlanejamento <= fimSemana
            );
        }
    )

    const diasPlanejados = planejamentosFiltrados.length;


    const diasComPesagem = planejamentosFiltrados.filter(
        (planejamento) =>
            planejamento.sobra.startsWith("Sobra registrada")).length;

    return (
        <View style={styles.container}>

            <Header name="Histórico" />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                <View style={[styles.content, { flexGrow: 1 }]}>

                    <View style={styles.presentation}>
                        <Text style={styles.titlePresentation}>
                            Histórico e resumo
                        </Text>

                        <Text style={styles.subtitlePresentation}>
                            Planejamento e registros em um só lugar.
                        </Text>
                    </View>

                    <Select
                        label="Tipo de refeição"
                        options={[
                            "Café da Manhã",
                            "Almoço",
                            "Lanche",
                            "Jantar",
                        ]}
                        value={refeicaoSelecionada}
                        onChange={setRefeicaoSelecionada}
                    />


                    <PeriodSelector
                        periodo={periodoFormatado}
                        onAnterior={() => setSemana(semana - 1)}
                        onProximo={() => setSemana(semana + 1)}
                    />


                    <View style={styles.indicators}>
                        <View style={styles.indicator}>
                            <Kpicard
                                variant="gestao"
                                title="Dias planejados"
                                value={diasPlanejados}
                            />
                        </View>

                        <View style={styles.indicator}>
                            <Kpicard
                                variant="gestao"
                                title="Dias com pesagem"
                                value={diasComPesagem}
                                unit={`de ${diasPlanejados}`}
                            />
                        </View>
                    </View>
                    <Text style={styles.title}> Planejamentos recentes</Text>

                    <Text style={styles.description}> Consulte os planejamentos registrados anteriormente</Text>

                    {planejamentosFiltrados.length === 0 ? (
                        <Text style={styles.messageVacated}>
                            Nenhum planejamento encontrado para {refeicaoSelecionada}.
                        </Text>
                    ) : (
                        planejamentosFiltrados.map((planejamento) => (
                            <Card
                                key={planejamento.id}
                                title={`${planejamento.data} · ${planejamento.refeicao}`}
                                description={`${planejamento.presentes} presentes → preparo para ${planejamento.preparo}`}
                            >
                                <Text style={styles.leftOver}>
                                    {planejamento.sobra}
                                </Text>
                            </Card>
                        ))
                    )}


                    <View style={{ marginTop: "auto", paddingTop: 16, marginBottom: 24 }}>
                        <Button
                            label="Exportar resumo"
                            onPress={() => console.log("Exportar resumo")}
                        />
                    </View>


                </View>

            </ScrollView>

            <BottomTabs />
        </View>
    )
}