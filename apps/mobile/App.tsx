import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RouteSuggestionScreen from './screens/RouteSuggestionScreen';
import PerformancePredictionScreen from './screens/PerformancePredictionScreen';
import StreakScreen from './screens/StreakScreen';

type Tab = 'routes' | 'prediction' | 'streak';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('routes');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'routes' && styles.tabItemActive]}
          onPress={() => setActiveTab('routes')}
        >
          <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>
            🗺️ Routen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'prediction' && styles.tabItemActive]}
          onPress={() => setActiveTab('prediction')}
        >
          <Text style={[styles.tabText, activeTab === 'prediction' && styles.tabTextActive]}>
            📊 Prognose
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'streak' && styles.tabItemActive]}
          onPress={() => setActiveTab('streak')}
        >
          <Text style={[styles.tabText, activeTab === 'streak' && styles.tabTextActive]}>
            🔥 Streak
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Screen content ────────────────────────────────────────────── */}
      {activeTab === 'routes' ? (
        <RouteSuggestionScreen />
      ) : activeTab === 'prediction' ? (
        <PerformancePredictionScreen />
      ) : (
        <StreakScreen />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#E53935',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#E53935',
    fontWeight: '700',
  },
});


