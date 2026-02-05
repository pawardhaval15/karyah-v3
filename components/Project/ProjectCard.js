import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircularProgress } from './ProjectStatistics';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const ProjectCard = memo(({ project = {}, theme, onTagsManagement, currentUserId }) => {
  const navigation = useNavigation();

  const {
    projectName = 'Untitled',
    location = 'Not specified',
    progress = 0,
    endDate,
    tags = [],
    status: projectStatus,
  } = project;

  // Determine Status
  let displayStatus = 'PENDING';
  let statusColor = '#F59E0B';
  let statusBg = 'rgba(245, 158, 11, 0.1)';

  const normalizedStatus = (projectStatus || '').toLowerCase();
  const isCompleted = normalizedStatus === 'completed' || progress >= 100;
  const isDelayed = !isCompleted && endDate && new Date(endDate) < new Date();

  if (isCompleted) {
    displayStatus = 'COMPLETED';
    statusColor = '#10B981'; // Green
    statusBg = 'rgba(16, 185, 129, 0.1)';
  } else if (isDelayed) {
    displayStatus = 'DELAYED';
    statusColor = '#EF4444'; // Red
    statusBg = 'rgba(239, 68, 68, 0.1)';
  } else if (normalizedStatus === 'in progress') {
    displayStatus = 'ONGOING';
    statusColor = '#3B82F6'; // Blue
    statusBg = 'rgba(59, 130, 246, 0.1)';
  } else {
    displayStatus = 'PENDING';
    statusColor = '#F59E0B'; // Amber
    statusBg = 'rgba(245, 158, 11, 0.1)';
  }

  const formattedEndDate = useMemo(() => {
    if (!endDate) return null;
    return new Date(endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [endDate]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ProjectDetailsScreen', { project })}
      activeOpacity={0.8}
      style={[styles.projectCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.cardMain}>
        <View style={styles.progressContainer}>
          <CircularProgress percentage={Math.round(progress)} size={54} strokeWidth={5} theme={theme} />
        </View>

        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text numberOfLines={1} style={[styles.projectName, { color: theme.text }]}>
            {projectName}
          </Text>
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={12} color={theme.secondaryText} />
            <Text numberOfLines={1} style={[styles.locationText, { color: theme.secondaryText }]}>
              {location || 'No Location'}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {displayStatus}
            </Text>
          </View>
          {formattedEndDate && (
            <View style={styles.dateRow}>
              <Feather name="calendar" size={12} color={theme.secondaryText} />
              <Text style={[styles.dateText, { color: theme.secondaryText }]}>{formattedEndDate}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  projectCard: {
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

export default ProjectCard;
