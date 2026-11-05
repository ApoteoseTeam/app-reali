import { View, Text, Image } from 'react-native'
import { styles} from './styles'

import { Button } from '../../components/Button/Button'

export default function TelaInicial() {
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/topdecoracao.png')}
                style={styles.topBlob}
                resizeMode="contain"
            />

            <Image
                source={require('../../assets/footergreen.png')}
                style={styles.bottomWave}
                resizeMode="stretch"
            />

            <View style={styles.content}>
                <View style={styles.headerGroup}>
                    <Text style={styles.title}>reali</Text>
                    <Text style={styles.subtitle}>Mais controle. Menos desperdício</Text>
                </View>

                <Text style={styles.description}>
                    Acompanhe e reduza o desperdício da merenda escolar. Dados que ajudam a construir um futuro mais sustentável.
                </Text>

                <View style={styles.buttonContainer}>
                    <Button label="Entrar" />
                    <Button label="Criar Conta" style={styles.buttonTwo} textStyle={styles.buttonTwoText} />
                </View>

                <View style={styles.footer}>
                    <View style={styles.footerTextGroup}>
                        <Text style={styles.footerText}>
                            Juntos por uma alimentação mais consciente.
                        </Text>
                    </View>

                    <Image
                        source={require('../../assets/pratoimg.png')}
                        style={styles.foodImage}
                        resizeMode="contain"
                    />
                </View>
            </View>
        </View>
    )
};