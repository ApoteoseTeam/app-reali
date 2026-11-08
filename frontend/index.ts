import { registerRootComponent } from 'expo';
import testPage from './src/screens/testPage'
import TelaInicial from './src/screens/TelaInicial/TelaInicial';
import PerfilUsuario from './src/screens/PerfilUsuario/PerfilUsuario';
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(PerfilUsuario);