import { View, Text, Image } from 'react-native'
import { styles } from './styles';

import { Button } from '../../components/Button/Button'

export default function TelaInicial({ onEntrar, onCadastro }: { onEntrar?: () => void; onCadastro?: () => void } = {}) {
    return (
        <View style={styles.container}>
            {/* 1. Decoração azul do topo esquerdo */}
            <Image
                // source={require('')}
                style={styles.topBlob}
                resizeMode="contain"
            />

        {/*    <Image source={require('../../assets/footergreen.png')} style={styles.bottomWave} resizeMode="stretch"/> */}

            <View style={styles.content}>
                <View style={styles.headerGroup}>
                    <Image source={require('../../assets/logo-reali.png')} style={styles.logo} resizeMode="contain"/>
                    <Text style={styles.subtitle}>Mais controle, menos desperdício</Text>
                </View>

                <Text style={styles.description}>
                    Acompanhe e reduza o desperdício da merenda escolar. Dados que ajudam a
                    construir um futuro mais sustentável.
                </Text>

                <View style={styles.buttonContainer}>
                    <Button label="Entrar" onPress={onEntrar} />
                    <Button label="Criar conta" onPress={onCadastro} style={styles.buttonTwo} textStyle={styles.buttonTwoText} />
                </View>
            </View>

            <Image
               // source={require('../../assets/prato-de-comida-2.png')}
                style={styles.foodImage}
                resizeMode="contain"
            />
        </View>
    );
}