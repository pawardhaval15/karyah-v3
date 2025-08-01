import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchDashboardStats } from '../../utils/dashboard';
import { fetchAssignedCriticalIssues } from '../../utils/issues';

export default function StatCardList({ navigation, theme, loading, refreshKey = 0 }) {
  const [statData, setStatData] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      const [apiData, criticalIssues] = await Promise.all([
        fetchDashboardStats(),
        fetchAssignedCriticalIssues()
      ]);
      setStatData([
        {
          title: 'Critical Issues',
          value: criticalIssues.length,
          total: apiData.issues?.total ?? 0,
          percent: apiData.issues?.total
            ? Math.round((criticalIssues.length / apiData.issues.total) * 100)
            : 0,
          extra: `Unres: ${apiData.issues?.unresolved ?? 0}`,
          gradientColors: ['#212121', '#FF2700'],
          screen: 'IssuesScreen',
        },

        {
          title: 'Issues',
          value: apiData.issues?.unresolved ?? 0,
          total: apiData.issues?.total ?? 0,
          percent: apiData.issues?.total
            ? Math.round((apiData.issues.unresolved / apiData.issues.total) * 100)
            : 0,
          extra: `Res: ${apiData.issues?.resolved ?? 0}`,
          gradientColors: ['#011F53', '#366CD9'],
          screen: 'IssuesScreen',
        },
        {
          title: 'Tasks',
          value: apiData.tasks?.inProgress ?? 0,
          total: apiData.tasks?.total ?? 0,
          percent: apiData.tasks?.total
            ? Math.round((apiData.tasks.inProgress / apiData.tasks.total) * 100)
            : 0,
          extra: `Pend: ${apiData.tasks?.pending ?? 0}`,
          extra2: `Comp: ${apiData.tasks?.completed ?? 0}`,
          gradientColors: ['#011F53', '#366CD9'],
          screen: 'MyTasksScreen',
        },
        {
          title: 'Projects',
          value: apiData.projects?.inProgress ?? 0,
          total: apiData.projects?.total ?? 0,
          percent: apiData.projects?.total
            ? Math.round((apiData.projects.inProgress / apiData.projects.total) * 100)
            : 0,
          extra: `Pend: ${apiData.projects?.pending ?? 0}`,
          extra2: `Comp: ${apiData.projects?.completed ?? 0}`,
          gradientColors: ['#011F53', '#366CD9'],
          screen: 'ProjectScreen',
        },
        {
          title: 'Connections',
          value: apiData.connections?.active ?? 0,
          total: apiData.connections?.total ?? 0,
          percent: apiData.connections?.total
            ? Math.round((apiData.connections.active / apiData.connections.total) * 100)
            : 0,
          extra: `Inact: ${apiData.connections?.inactive ?? 0}`,
          gradientColors: ['#011F53', '#366CD9'],
          screen: 'ConnectionsScreen',
        },
      ]);
    }
    fetchStats();
  }, [refreshKey]);

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={theme.primary || '#366CD9'} />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', paddingLeft: 20, paddingRight: 20 }}
      style={{ marginBottom: 0 }}
    >
      {statData.map((item, idx) => (
        <View key={item.title} style={{ marginRight: idx !== statData.length - 1 ? 12 : 0 }}>
          <StatCard {...item} navigation={navigation} theme={theme} />
        </View>
      ))}
    </ScrollView>
  );
}

function StatCard({ title, value, total, percent, gradientColors, screen, navigation, theme, extra, extra2 }) {
  const handlePress = () => {
    if (navigation && screen) {
      navigation.navigate(screen);
    }
  };

  // Combine extras into one line, filter out falsy values
  const extrasLine = [extra, extra2].filter(Boolean).join(' • ');

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
      <View style={[
        styles.card,
        { backgroundColor: theme.card }
      ]}>
        <LinearGradient
          colors={gradientColors || ['#011F53', '#366CD9']}
          start={{ x: 0, y: 2 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientSection}
        >
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.cardSubTitleRow}>
            <Text style={styles.cardSubTitle}>
              {value}
              <Text style={{ color: '#fff', opacity: 0.7 }}> / {total}</Text>
            </Text>
            {extrasLine ? (
              <Text style={styles.cardExtra}>{extrasLine}</Text>
            ) : null}
          </View>
        </LinearGradient>
        <View style={[
          styles.bottomSection,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          }
        ]}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>{percent}%</Text>
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
            <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: theme.primary }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
    marginRight: 0,
    overflow: 'hidden',
  },
  gradientSection: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardSubTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  cardSubTitle: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 0,
    fontWeight: '400',
  },
  cardExtra: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.85,
    marginTop: 2,
    marginBottom: 0,
    fontWeight: '400',
  },
  bottomSection: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderColor: '#e5e7eb',
    borderWidth: 0.8,
    borderTopWidth: 0,
  },
  progressLabel: {
    color: '#222',
    fontWeight: '400',
    fontSize: 14,
    marginBottom: 2,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#366CD9',
    borderRadius: 2,
  },
});