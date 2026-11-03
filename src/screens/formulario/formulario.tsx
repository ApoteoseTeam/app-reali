import { View, Text, ScrollView } from 'react-native';
import { styles } from './styles';
import { Stepper } from '../../components/Stepper/Stepper';
import { Banner } from '../../components/Banner/Banner';
import { SegmentedControl } from '../../components/segmentedControl/SegmentedControl';
import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { Header } from '../../components/Header/Header';

export default function Formulario() {

  const [refeicaoSelecionada, setRefeicaoSelecionada] = useState("Almoço");

  return (

    <ScrollView>
      <View style={styles.mainWrapper}>
        <Header name="Formulário-Cantina" />


        <View style={styles.container}>
          <Stepper currentStep={1} />

          <Banner
            tipo="info"
            mensagem="Preencha os dados da refeição e informe as quantidades de alimentos preparados e as sobras (se houver)."
          />

          <View style={styles.conteudo}>
            <Text style={styles.subtitulo}>Data da coleta:</Text>

            <View style={styles.data}>
              <Text>▦   16/10/2026</Text>
              <Text>▣</Text>
            </View>

            <Text style={styles.subtitulo}>Tipo de Refeição</Text>

            <SegmentedControl
              opcoes={["Café da Manhã", "Almoço", "Lanche", "Jantar"]}
              selecionado={refeicaoSelecionada}
              aoSelecionar={setRefeicaoSelecionada}
            />

            <Text style={styles.subtitulo}>Preparações</Text>

            <View style={styles.titulosColunas}>
              <Text style={styles.textoPequeno}>Alimento</Text>
              <Text style={styles.textoPequeno}>Preparado (kg)</Text>
              <Text style={styles.textoPequeno}>Sobra (kg)</Text>
            </View>

            <View style={styles.alimento}>
              <Text style={styles.comida}> Arroz</Text>
              <Text style={styles.quantidade}>10,0</Text>
              <Text style={styles.quantidade}>1,2</Text>
            </View>

            <Button
              label="+ Adicionar outro alimento"
              onPress={() => { }}
              style={styles.adicionar}
              textStyle={{ color: '#2D6655', fontWeight: '600' }}
            />

            <View style={styles.proximo}>
              <Text style={styles.textoBranco}>Próximo</Text>
            </View>
          </View>

        </View>
        <View style={styles.menu}>
          <View style={styles.itemMenu}>
            <Text style={styles.icone}></Text>
            <Text style={styles.textoMenu}>Home</Text>
          </View>

          <View style={styles.itemMenu}>
            <Text style={styles.icone}></Text>
            <Text style={styles.textoMenu}>Formulário</Text>
          </View>

          <View style={styles.itemMenu}>
            <Text style={styles.icone}></Text>
            <Text style={styles.textoMenu}>Dashboard</Text>
          </View>

          <View style={styles.itemMenu}>
            <Text style={styles.icone}></Text>
            <Text style={styles.textoMenu}>Perfil</Text>
          </View>
        </View>
      </View>
    </ScrollView>

  );
}

