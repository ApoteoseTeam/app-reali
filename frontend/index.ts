import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import testPage from './src/screens/testPage'
import TelaInicial from './src/screens/TelaInicial/TelaInicial';
import PerfilUsuario from './src/screens/PerfilUsuario/PerfilUsuario';
import Home from './src/screens/HomeGestao/Home';
import Relatorio from './src/screens/Relatorio/Relatorio';
import CardapioSemanaCozinha from './src/screens/CardapioCozinha/CardapioCozinha';
import AdicionarCardapio from './src/screens/AdicionarCardapio/AdicionarCardapio';
import HomeCozinha from './src/screens/HomeCozinha/HomeCozinha';
import CardapioSemanaGestao from './src/screens/CardapioGestao/CardapioGestao';
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
function App() {
    return createElement(TelaInicial);
}

registerRootComponent(App);