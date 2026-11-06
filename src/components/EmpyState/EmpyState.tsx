import {
    Image,
    Text,
    View,
    type ImageSourcePropType,
} from 'react-native';

import { Button } from '../Button/Button';
import { globalStyles } from '../../theme/global';
import { styles } from './styles';

type EmptyStateProps = {
    illustration: ImageSourcePropType;
    title: string;
    description: string;
    buttonLabel: string;
    onButtonPress: () => void;
};

export function EmptyState({
    illustration,
    title,
    description,
    buttonLabel,
    onButtonPress,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Image
                source={illustration}
                style={styles.illustration}
                resizeMode="contain"
                accessible={false}
            />
            

            <Text accessibilityRole="header" style={styles.title}>
                {title}
            </Text>

            <Text style={styles.description}>{description}</Text>

            <Button
                label={buttonLabel}
                onPress={onButtonPress}
                accessibilityRole="button"
                style={[globalStyles.button, styles.button]}
                textStyle={styles.buttonText}
            />
        </View>
    );
}