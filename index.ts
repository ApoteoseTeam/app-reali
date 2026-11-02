import { registerRootComponent } from 'expo';
import testPage from './src/screens/testPage'
import FormularioResumo from './src/screens/formulario-resumo/formularioResumo';
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(FormularioResumo);