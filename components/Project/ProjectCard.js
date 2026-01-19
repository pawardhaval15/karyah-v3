import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomCircularProgress from 'components/task details/CustomCircularProgress';
import { memo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

function ProjectCard({ project = {}, theme, onTagsManagement, currentUserId }) {
  const navigation = useNavigation();

  const {
    projectName = 'Untitled',
    location = 'Not specified',
    progress = 0,
    endDate,
    tags = [],
    status: projectStatus,
  } = project;

  const firstLetter = projectName?.charAt(0)?.toUpperCase() || '?';

  // Determine Status
  let displayStatus = 'PENDING';
  let statusColor = '#F59E0B'; // Default Pending (Orange)
  let statusBg = 'rgba(245, 158, 11, 0.1)';

  const normalizedStatus = (projectStatus || '').toLowerCase();
  const isCompleted = normalizedStatus === 'completed' || progress >= 100;
  const isDelayed = !isCompleted && endDate && new Date(endDate) < new Date();

  if (isCompleted) {
    displayStatus = 'COMPLETED';
    statusColor = '#34C759'; // Green
    statusBg = 'rgba(52, 199, 89, 0.1)';
  } else if (isDelayed) {
    displayStatus = 'DELAYED';
    statusColor = '#FF3B30'; // Red
    statusBg = 'rgba(255, 59, 48, 0.1)';
  } else if (normalizedStatus === 'in progress') {
    displayStatus = 'WORKING';
    statusColor = '#007AFF'; // Blue
    statusBg = 'rgba(0, 122, 255, 0.1)';
  } else if (normalizedStatus === 'pending') {
    displayStatus = 'PENDING';
    statusColor = '#F59E0B'; // Amber
    statusBg = 'rgba(245, 158, 11, 0.1)';
  } else {
    // Handle null or unknown status - Default to PENDING as safe fallback
    displayStatus = 'PENDING';
    statusColor = '#F59E0B'; // Amber
    statusBg = 'rgba(245, 158, 11, 0.1)';
  }

  // Format endDate
  const formattedEndDate = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    : '';

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ProjectDetailsScreen', { project })}
      style={[styles.projectCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      {/* Left Icon Box */}
      <View style={[styles.projectIcon, { backgroundColor: theme.avatarBg || '#F2F6FF' }]}>
        <Feather name="folder" size={24} color={theme.primary} />
      </View>

      {/* Middle Content */}
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.projectName, { color: theme.text }]}>
          {projectName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="map-pin" size={12} color={theme.secondaryText} style={{ marginRight: 4 }} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.secondaryText, fontSize: 12 }}>
            {location || 'No Location'}
          </Text>
        </View>

        {/* Tags (Optional, kept minimal) */}
        {tags && Array.isArray(tags) && tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, flexGrow: 0 }}>
            {tags.slice(0, 2).map((tag, idx) => (
              <View key={idx} style={{ backgroundColor: theme.avatarBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4 }}>
                <Text style={{ fontSize: 10, color: theme.secondaryText }}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Right Column: Status & Date/Progress */}
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={{
          backgroundColor: statusBg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 10, color: statusColor, fontWeight: '800', textTransform: 'uppercase' }}>
            {displayStatus}
          </Text>
        </View>

        {formattedEndDate ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="calendar" size={12} color={theme.secondaryText} style={{ marginRight: 4 }} />
            <Text style={{ color: theme.secondaryText, fontSize: 11, fontWeight: '600' }}>
              {formattedEndDate}
            </Text>
          </View>
        ) : (
          <View style={{ transform: [{ scale: 0.7 }] }}>
            <CustomCircularProgress percentage={progress || 0} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
});

export default memo(ProjectCard);
