import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const fetchStatData = () =>
  Promise.resolve([
    {
      title: 'Tasks',
      value: 12,
      total: 20,
      percent: 60,
      icon: 'check-circle',
      gradientColors: ['#011F53', '#366CD9'],
    },
    {
      title: 'Critical Issues',
      value: 4,
      total: 10,
      percent: 40,
      icon: 'alert-triangle',
      gradientColors: ['#7E180E', '#E67514'],
    },
    {
      title: 'Open Issues',
      value: 2,
      total: 7,
      percent: 28,
      icon: 'info',
      gradientColors: ['#0C2340', '#366CD9'],
    },
    {
      title: 'Projects',
      value: 6,
      total: 10,
      percent: 60,
      icon: 'folder',
      gradientColors: ['#19345E', '#6A93FF'],
    },
    {
      title: 'Connections',
      value: 14,
      total: 20,
      percent: 70,
      icon: 'users',
      gradientColors: ['#0A2647', '#4E9EFF'],
    },
  ]);

export default function StatCardList() {
  const [statData, setStatData] = useState([]);

  useEffect(() => {
    fetchStatData().then(setStatData);
  }, []);

  return (
    <FlatList
      data={statData}
      numColumns={2}
      keyExtractor={(item) => item.title}
      columnWrapperStyle={styles.row}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      renderItem={({ item }) => <StatCard {...item} />}
    />
  );
}

function StatCard({ title, value, total, percent, gradientColors, icon }) {
  return (
    <View style={styles.card}>
      <LinearGradient colors={gradientColors} style={styles.header}>
        <Feather name={icon} size={22} color="#fff" style={styles.icon} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>
          {value}
          <Text style={styles.total}> / {total}</Text>
        </Text>
      </LinearGradient>
      <View style={styles.footer}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressBar, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    width: '48%',
  },
  header: {
    padding: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  icon: {
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  total: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '400',
  },
  footer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    flex: 1,
    marginRight: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#366CD9',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
});
