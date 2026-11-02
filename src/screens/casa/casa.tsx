import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

import { styles } from './style';

import { Logo } from '../../components/Logo';
import { Button } from '../../components/button';
import { Kpicard } from '../../components/Kpicard/Kpicard';
import { Card } from '../../components/Card';
import { IconButton } from '../../components/iconbuttons/IconButton';
import { Bell } from 'lucide-react-native';
import { History, Utensils, BarChart2, MessageSquare } from 'lucide-react-native';


export default function Home() {
    return (
        <ScrollView>
            <View style={styles.container}>
                <View style={styles.topContent}>
                    <Logo />

                    <View style={styles.bell}>
                        <IconButton
                            icon={Bell}
                            onPress={() => {
                                console.log('Notificações pressionadas');
                            }} />
                    </View>
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Bom dia, Letícia</Text>

                    <Text style={styles.subtitle}>Escola Municipal Novo Horizonte</Text>


                    <Button label="+ Registrar refeição de hoje" />

                    <Text>Outubro de 2026</Text>

                    <View style={styles.card}>

                        <Card title="Sobra total" description="23,5kg" />
                        <Card title="g por refeição" description="18 g" />

                    </View>
                    
                    <Kpicard title="16/10 Almoço, sobra" value={4.5} unit="kg" />

                    <View style={styles.cardAttention}>
                        <Text style={styles.textCardAttention}>
                            Ponto de atenção: <Text style={styles.textNormal}>a Salada teve 20% de sobra no último almoço. Hipótese para conversar com a equipe, não é conclusão.</Text>
                        </Text>

                    </View>
                </View>

                <View style={styles.menuContainer}>

                    <Pressable style={styles.menuCard} onPress={() => console.log('Histórico')}>
                        <History size={22} color="#1F3A30" />
                        <Text style={styles.menuText}>Histórico</Text>
                    </Pressable>

                    <Pressable style={styles.menuCard} onPress={() => console.log('Cardápio')}>
                        <Utensils size={22} color="#1F3A30" />
                        <Text style={styles.menuText}>Cardápio</Text>
                    </Pressable>

                    <Pressable style={styles.menuCard} onPress={() => console.log('Relatório')}>
                        <BarChart2 size={22} color="#1F3A30" />
                        <Text style={styles.menuText}>Relatório</Text>
                    </Pressable>

                    <Pressable style={styles.menuCard} onPress={() => console.log('Assistente')}>
                        <MessageSquare size={22} color="#1F3A30" />
                        <Text style={styles.menuText}>Assistente</Text>
                    </Pressable>

                </View>

                <Text style={styles.textFooter}>Valores ilustrativos para demonstração.</Text>

                <View style={styles.footerContainer}>
                    <Pressable style={styles.footerItem} onPress={() => console.log('Home')}>
                        <Text style={styles.footerTextActive}>Home</Text>
                    </Pressable>

                    <Pressable style={styles.footerItem} onPress={() => console.log('Formulário')}>
                        <Text style={styles.footerTextInactive}>Formulário</Text>
                    </Pressable>

                    <Pressable style={styles.footerItem} onPress={() => console.log('Dashboard')}>
                        <Text style={styles.footerTextInactive}>Dashboard</Text>
                    </Pressable>

                    <Pressable style={styles.footerItem} onPress={() => console.log('Perfil')}>
                        <Text style={styles.footerTextInactive}>Perfil</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    )
}


