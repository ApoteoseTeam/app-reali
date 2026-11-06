import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';

import { globalStyles } from '../theme/global';
import { Chart } from '../components/Chart/Chart';

import { Stepper } from "../components/Stepper/Stepper";
import { EmptyState } from "../components/EmpyState/EmpyState";

// Ícones
import {
  Bell,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react-native';


// Componentes
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Checkbox } from '../components/CheckBox/CheckBox';
import { IconButton } from '../components/IconButton/IconButton';
import { Logo } from '../components/Logo/Logo';
import { Select } from '../components/Select/Select';
import { Skeleton } from "../components/Skeleton/Skeleton";
import { Chip } from "../components/Chip/Chip";
import { PreparationRow } from "../components/PreparationRow/PreparationRow";
import { Header } from '../components/Header/Header';
import { Banner } from "../components/Banner/Banner";
import { SegmentedControl } from '../components/SegmentedControl/SegmentedControl';
import { MenuDayCard } from '../components/MenuDayCard/MenuDayCard';

export default function testPage() {
  const [checked, setChecked] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [periodo, setPeriodo] = useState("Semana")
  const historicoVazio = require("../../assets/historico-vazio.png");

  function abrirFormulario() {
    console.log('Clicou em Novo registro');
  }
  // Função para abrir o formulário de registro//
  return (
    <ScrollView>
      <View style={globalStyles.container}>
        <Header name="Dashboard" />
        <Text style={globalStyles.title}>
          Essa Página é para testar componentes criados
        </Text>

        <Text style={globalStyles.subtitle}>
          Nosso projeto Demo Day!
        </Text>

        <Stepper currentStep={3} />

        <Text style={globalStyles.title}>Botão:</Text>
        <Button label="Cadastro" />

        <Text style={globalStyles.title}>Input:</Text>
        <Input
          placeholder="Digite seu e-mail"
          keyboardType="email-address"
        />

        <Text style={globalStyles.title}>Checkbox:</Text>
        <Checkbox
          text="Sim ou Não"
          checked={checked}
          onChange={setChecked}
        />

        <Text style={globalStyles.title}>IconButtons:</Text>

        <IconButton
          icon={Bell}
          onPress={() => console.log('Notificações')}
        />

        <IconButton
          icon={Pencil}
          onPress={() => console.log('Editar')}
        />

        <IconButton
          icon={Trash2}
          onPress={() => console.log('Lixeira')}
        />

        <IconButton
          icon={ChevronLeft}
          onPress={() => console.log('Seta esquerda')}
        />

        <IconButton
          icon={ChevronRight}
          onPress={() => console.log('Seta direita')}
        />

        <IconButton
          icon={Send}
          onPress={() => console.log('Enviar')}
        />

        <Text style={globalStyles.title}>Logo:</Text>
        <Logo />

        <Text style={globalStyles.title}>Select:</Text>

        <Select
          label="Categoria do alimento"
          options={[
            'Grãos e cereais',
            'Frutas',
            'Hortaliças',
            'Carnes',
          ]}
          value={categoria}
          onChange={setCategoria}
        />

        <Banner
          tipo="info"
          titulo="Informação"
          mensagem="Este é um banner informativo."
        />

        <Banner
          tipo="alerta"
          titulo="Atenção"
          mensagem="Verifique os dados informados."
        />

        <Banner
          tipo="erro"
          titulo="Erro"
          mensagem="Não foi possível salvar os dados."
        />

        <Banner
          tipo="sucesso"
          titulo="Sucesso"
          mensagem="Dados salvos com sucesso!"
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip texto="Todas as Refeições" />
          <Chip texto="Setembro - 2026" />
          <Chip texto="Outubro - 2026" />
        </View>

        <Skeleton largura={100} altura={20} />
        <br />
        <Skeleton largura={200} altura={40} />
        <br />
        <Skeleton largura={300} altura={100} />

        <PreparationRow
          refeicao="Almoço"
          preparacoes={[
            "Arroz - 12%",
            "Feijão - 10%",
            "Carne - 4%"
          ]}
        />

        <SegmentedControl
          opcoes={["Semana", "Mês"]}
          selecionado={periodo}
          aoSelecionar={setPeriodo}
        />

        <Text style={globalStyles.subtitle}>
          Selecionado: {categoria || 'Nenhum'}
        </Text>


        <EmptyState
          illustration={historicoVazio}
          title="Nenhum registro ainda"
          description="Registre a primeira refeição para ver o ranking de sobras e acompanhar a evolução."
          buttonLabel="Novo registro"
          onButtonPress={abrirFormulario}
        />

        <MenuDayCard
          dia="Segunda-feira"
          refeicoes={[
            {
              nome: "Almoço",
              preparacoes: [
                "Arroz - 12%",
                "Feijão - 10%",
                "Carne - 4%",
              ],
            },
            {
              nome: "Lanche",
              preparacoes: ["Fruta - 17%"],
            },
          ]}
        />

        <Chart
          style={{ marginVertical: 24, borderRadius: 20 }}
          variant="line"
          series={[
            {
              name: "Este mês",
              color: "#315F52",
              points: [
                { label: "Seg", value: 0.8, color: "#FFB627", accessibilityLabel: "segunda-feira", },
                { label: "Ter", value: 0.7, accessibilityLabel: "terça-feira", },
              ],
            },
            {
              name: "Mês passado",
              color: "#87929C",
              points: [
                { label: "Seg", value: 1.2 },
                { label: "Ter", value: 1.0 },
              ],
            },
          ]}
        />
      </View>
    </ScrollView>
  );
}