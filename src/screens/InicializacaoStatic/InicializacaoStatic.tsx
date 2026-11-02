import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { stylesInicializacao } from './style';

export default function TelaInicial() {
  return (
    <View style={stylesInicializacao.container}>
      <View style={stylesInicializacao.spacer} />

      <View style={stylesInicializacao.centerContent}>
        <Text style={stylesInicializacao.logo}>reali</Text>
        <Text style={stylesInicializacao.subtitle}>Mais controle. Menos desperdício.</Text>
      </View>

      <View style={stylesInicializacao.footer}>
        <View style={stylesInicializacao.progressBar}>
          <View style={stylesInicializacao.progressFill} />
        </View>
        <Text style={stylesInicializacao.loadingText}>Iniciando...</Text>
      </View>
    </View>
  );
}

