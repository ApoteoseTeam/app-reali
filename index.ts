import { registerRootComponent } from 'expo';
import testPage from './src/screens/testPage'
import TelaInicial from './src/screens/home/tela-inicial';
import PerfilUsuario from './src/screens/chatboxIA/chatboxIA';
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(PerfilUsuario);