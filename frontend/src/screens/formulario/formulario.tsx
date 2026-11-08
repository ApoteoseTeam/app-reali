import { View, Text, ScrollView } from 'react-native';
import { styles } from './styles';

export default function Formulario() {
  return (
    <View style={styles.container}>

      <View>
        <Text style={styles.titulo}>Formulário-Cantina</Text>
        <Text style={styles.sino}>♧</Text>
      </View>

      <ScrollView>
        <View style={styles.etapas}>
          <View style={styles.etapaAtiva}>
            <Text style={styles.numero}>1</Text>
          </View>
          <View style={styles.linha} />
          <View style={styles.etapa}>
            <Text style={styles.numero}>2</Text>
          </View>
          <View style={styles.linha} />
          <View style={styles.etapa}>
            <Text style={styles.numero}>3</Text>
          </View>
          <View style={styles.linha} />
          <View style={styles.etapa}>
            <Text style={styles.numero}>4</Text>
          </View>
        </View>

        <View style={styles.textosEtapas}>
          <Text style={styles.textoEtapa}>Dados</Text>
          <Text style={styles.textoEtapa}>Alimentos</Text>
          <Text style={styles.textoEtapa}>Quantidades</Text>
          <Text style={styles.textoEtapa}>Finalizar</Text>
        </View>

        <View style={styles.aviso}>
          <Text style={styles.textoAviso}>
            Preencha os dados da refeição e informe as
            quantidades preparadas e as sobras.
          </Text>
        </View>

        <View style={styles.conteudo}>
          <Text style={styles.subtitulo}>Data da coleta:</Text>

          <View style={styles.data}>
            <Text>▦   16/10/2026</Text>
            <Text>▣</Text>
          </View>

          <Text style={styles.subtitulo}>Tipo de Refeição</Text>

          <View style={styles.refeicoes}>
            <View style={styles.botaoRefeicao}>
              <Text style={styles.textoBotao}>Café da Manhã</Text>
            </View>

            <View style={styles.almoco}>
              <Text style={styles.textoBranco}>Almoço</Text>
            </View>

            <View style={styles.botaoRefeicao}>
              <Text style={styles.textoBotao}>Lanche</Text>
            </View>

            <View style={styles.botaoRefeicao}>
              <Text style={styles.textoBotao}>Jantar</Text>
            </View>
          </View>

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


          <View style={styles.adicionar}>
            <Text style={styles.textoAdicionar}>
              +   Adicionar outro alimento
            </Text>
          </View>

          <View style={styles.proximo}>
            <Text style={styles.textoBranco}>Próximo</Text>
          </View>
        </View>
      </ScrollView>

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
  );
}

