import { BarChart, LineChart } from 'react-native-chart-kit';
import { styles, chartConfig } from './styles';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

type ChartPoint = {
    label: string;
    value: number;
    color?: string;
    accessibilityLabel?: string;
};

type ChartVariant = 'bar' | 'line';

type ChartSeries = {
    name: string;
    color: string;
    points: ChartPoint[];
};

type ChartProps = {
    data?: ChartPoint[];
    variant?: ChartVariant;
    height?: number;
    width?: number;
    color?: string;
    unit?: string;
    style?: StyleProp<ViewStyle>;
    series?: ChartSeries[];
    accessibilityLabel?: string;
};

export const Chart = ({ data = [], variant = "line", height = 200, width = 320, color = "#315F52", unit = " kg", style, series, accessibilityLabel }: ChartProps) => {

    const objectSeries = {
        name: "Dados",
        color: color,
        points: data,
    };

    const activeSeries = series && series.length > 0
        ? series
        : [objectSeries];

    const populatedSeries = activeSeries.filter(
        serie => serie.points.length > 0
    );

    if (populatedSeries.length === 0) {
        return (
            <Text style={styles.noDataText}>Nenhum dado disponível para exibir o gráfico.</Text>
        );
    }

    if (variant === "bar" && populatedSeries.length > 1) {
        return (
            <Text style={styles.noDataText}>
                Para comparar séries, use o gráfico de linhas.
            </Text>
        );
    }

    const config = {
        ...chartConfig,
        color: () => color,
    };

    const rotulos = populatedSeries[0].points.map((item) => item.label);

    const sameLength = populatedSeries.every(
        (serie) => serie.points.length === rotulos.length
    );

    const sameLabels = populatedSeries.every((serie) =>
        serie.points.every((point, index) =>
            point.label === rotulos[index]
        )
    );

    if (!sameLength || !sameLabels) {
        return (
            <Text style={styles.noDataText}>
                Não foi possível comparar os períodos.
            </Text>
        );
    }

    const datasets = populatedSeries.map((serie) => ({
        data: serie.points.map((item) => item.value),
        color: () => serie.color,
        colors: serie.points.map(
            (point) => () => point.color ?? serie.color
        ),
    }));

    const legends = populatedSeries.map((serie) => serie.name);

    const seriesDescriptions = populatedSeries.map((serie) => {
        const pointDescriptions = serie.points.map(
            (point) =>
                `${point.accessibilityLabel ?? point.label}: ${point.value}${unit}`
        );

        const pointsText = pointDescriptions.join("; ");

        return `${serie.name}: ${pointsText}`;
    });

    const accessibilityDescription =
        `Gráfico de ${variant}. ${seriesDescriptions.join(". ")}.`;

    const accessibilityLabelFinal = accessibilityLabel || accessibilityDescription;
    console.log(accessibilityLabelFinal);

    const chartData = {
        labels: rotulos,
        datasets: datasets,
        legend: legends,
    };

    const chartStyle = {
        ...StyleSheet.flatten([styles.chart, style]),
    };



    if (variant === 'bar') {
        return (
            <View accessible={true}
                accessibilityRole="image"
                accessibilityLabel={accessibilityLabelFinal}>
                <View
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden={true}
                    aria-hidden={true}
                >
                    <BarChart data={chartData} width={width} height={height} chartConfig={config} style={chartStyle} yAxisLabel=""
                        yAxisSuffix={unit} fromZero={true} withCustomBarColorFromData={true}
                        flatColor={true} />
                </View>
            </View>
        )

    }

    return (
        <View accessible={true}
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabelFinal}>
            <View
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden={true}
                aria-hidden={true}
            >
                <LineChart data={chartData} width={width} height={height} chartConfig={config} style={chartStyle} yAxisLabel=""
                    yAxisSuffix={unit} />
            </View>
        </View>
    );

}; 