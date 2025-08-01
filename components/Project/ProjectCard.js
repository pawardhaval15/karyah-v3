import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomCircularProgress from 'components/task details/CustomCircularProgress';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProjectCard({ project = {}, theme }) {
  const navigation = useNavigation();

  const {
    projectName = 'Untitled',
    location = 'Not specified',
    progress = 0,
    endDate,
  } = project;

  const firstLetter = projectName?.charAt(0)?.toUpperCase() || '?';

  // Calculate remaining/delayed/completed time
  let remainingText = 'N/A';
  let statusColor = theme.secondaryText || '#666';

  if (progress >= 100) {
    remainingText = 'Completed';
  } else if (endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      // Project is past end date and not completed
      const delayedDays = Math.abs(diffDays);
      remainingText = `Delayed by ${delayedDays} day${delayedDays > 1 ? 's' : ''}`;
      statusColor = '#E53935'; // red color for delayed
    } else if (diffDays === 0) {
      remainingText = 'Ends Today';
    } else {
      remainingText = `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    }
  }

  // Format endDate nicely for display
  const formattedEndDate = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '-';

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ProjectDetailsScreen', { project })}
      style={[styles.projectCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.projectIcon, { backgroundColor: theme.avatarBg || '#F2F6FF' }]}>
        <Text style={[styles.projectIconText, { color: theme.primary }]}>{firstLetter}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.projectName, { color: theme.text }]}>{projectName}</Text>

        <View style={styles.projectRow}>
          <Feather name="clock" size={14} color={statusColor} style={{ marginRight: 6 }} />
          <Text style={[styles.endDateText, { color: theme.text }]}>{formattedEndDate}</Text>
        </View>

        <View style={styles.projectRow}>
          <Feather name="map-pin" size={14} color={theme.secondaryText || '#666'} />
          <Text style={[styles.projectInfo, { color: theme.secondaryText || '#666' }]}>{location || 'N/A'}</Text>
        </View>
      </View>

      {/* Container for End Date above progress */}
      <View style={styles.endDateProgressContainer}>
        <View style={styles.projectRow}>
          {/* <Feather name="clock" size={14} color={statusColor} /> */}
          <Text style={[styles.projectInfo, { color: statusColor }]}>{remainingText}</Text>
        </View>
        
        <View
          style={[
            styles.progressCircle,
            {
              borderColor: theme.primary,
              backgroundColor: theme.card,
            },
          ]}
        >
          <CustomCircularProgress percentage={progress || 0} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6eaf3',
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F2F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  projectIconText: {
    color: '#366CD9',
    fontWeight: '600',
    fontSize: 20,
  },
  projectName: {
    color: '#222',
    fontWeight: '500',
    fontSize: 16,
    marginBottom: 2,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  projectInfo: {
    color: '#666',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '400',
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 50,
    borderWidth: 2,
    width: 50,
    height: 50,
  },
  endDateProgressContainer: {
    alignItems: 'center',
    marginLeft: 10,
    justifyContent: 'flex-start',
  },
  endDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
