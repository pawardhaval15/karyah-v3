import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import { getUserWeeklyAnalysis } from '../../utils/analysis'; // adjust path as needed

const options = ['Issues', 'Tasks', 'Projects'];

export default function DailyProgressCard({ theme, refreshKey = 0 }) {
  const [selected, setSelected] = useState('Issues');
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const data = await getUserWeeklyAnalysis(token);
        // console.log('Weekly Analysis Data:', data);

        setWeeklyData({
          Issues: {
            total: data.issues.total,
            done: data.issues.done,
            underway: data.issues.underway,
            notStarted: data.issues.notStarted,
            added: 0, // You can add these if your API returns them
            missed: 0,
            duration: '-',
          },
          Tasks: {
            total: data.tasks.total,
            done: data.tasks.completed,
            underway: data.tasks.inProgress,
            notStarted: data.tasks.pending,
            added: 0,
            missed: 0,
            duration: '-',
          },
          Projects: {
            total: data.projects.total,
            done: data.projects.completed,
            underway: data.projects.inProgress,
            notStarted: data.projects.pending,
            added: 0,
            missed: 0,
            duration: '-',
          },
        });
      } catch (e) {
        setDataSets(null);
      }
      setLoading(false);
    };
    fetchAnalysis();
  }, [refreshKey]);

  if (loading || !weeklyData || !weeklyData[selected]) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', height: 200 }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const { total, done, underway, notStarted, added, missed, duration } = weeklyData[selected];


  // Chart calculations
  const size = 90;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;



  const donePercent = total === 0 ? 0 : done / total;
  const underwayPercent = total === 0 ? 0 : underway / total;
  const notStartedPercent = total === 0 ? 0 : notStarted / total;

  const doneLength = circumference * donePercent;
  const underwayLength = circumference * underwayPercent;
  const notStartedLength = circumference * notStartedPercent;




  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Weekly progress</Text>
        <View style={[styles.switchRow, { backgroundColor: theme.secCard }]}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.switchBtn,
                selected === opt && { backgroundColor: theme.primary }
              ]}
              onPress={() => setSelected(opt)}
            >
              <Text style={[
                styles.switchBtnText,
                { color: theme.secondaryText },
                selected === opt && { color: '#fff' }
              ]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.chartPlaceholder, { backgroundColor: theme.secCard }]}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.border}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Done */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${doneLength},${circumference - doneLength}`}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
            {/* Underway */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F59E42"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${underwayLength},${circumference - underwayLength}`}
              strokeDashoffset={-doneLength}
              strokeLinecap="round"
            />
            {/* Not Started */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F87171"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${notStartedLength},${circumference - notStartedLength}`}
              strokeDashoffset={-(doneLength + underwayLength)}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <View style={styles.progressInfo}>
          <Text style={[styles.totalTasks, { color: theme.text }]}>Total: {total} {selected.toLowerCase()}</Text>
          <Text style={[styles.progressText, { color: theme.primary }]}>● {Math.round(donePercent * 100)}% <Text style={styles.label}>({done} done)</Text></Text>
          <Text style={[styles.progressText, { color: '#F59E42' }]}>● {Math.round(underwayPercent * 100)}% <Text style={styles.label}>({underway} underway)</Text></Text>
          <Text style={[styles.progressText, { color: '#F87171' }]}>● {Math.round(notStartedPercent * 100)}% <Text style={styles.label}>({notStarted} not started)</Text></Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginHorizontal: 18,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#e6eaf3',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    color: '#222',
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f6fa',
    borderRadius: 20,
    padding: 2,
  },
  switchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  switchBtnActive: {
    backgroundColor: '#3B82F6',
  },
  switchBtnText: {
    color: '#222',
    fontWeight: '400',
    fontSize: 13,
  },
  switchBtnTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f3f6fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  progressInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  totalTasks: {
    color: '#222',
    fontWeight: '500',
    marginBottom: 4,
  },
  progressText: {
    fontWeight: '400',
    fontSize: 13,
    marginBottom: 2,
  },
  label: {
    color: '#888',
    fontWeight: '400',
    fontSize: 13,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  overviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  overviewValue: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 18,
    marginBottom: 2,
  },
  overviewLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '400',
  },
});