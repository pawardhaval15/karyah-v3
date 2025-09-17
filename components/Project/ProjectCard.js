import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomCircularProgress from 'components/task details/CustomCircularProgress';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function ProjectCard({ project = {}, theme, onTagsManagement, currentUserId }) {
  const navigation = useNavigation();

  const {
    projectName = 'Untitled',
    location = 'Not specified',
    progress = 0,
    endDate,
    tags = [],
  } = project;

  const firstLetter = projectName?.charAt(0)?.toUpperCase() || '?';

  // Check if current user is the creator of the project
  const isCreator = currentUserId && (
    project.createdBy === currentUserId || 
    project.creatorId === currentUserId ||
    project.userId === currentUserId ||
    project.creator === currentUserId
  );

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
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.projectName, { color: theme.text }]}>{projectName}</Text>

        <View style={styles.projectRow}>
          <Feather name="clock" size={14} color={statusColor} style={{ marginRight: 6 }} />
          <Text style={[styles.endDateText, { color: theme.text }]}>{formattedEndDate}</Text>
        </View>

        <View style={styles.projectRow}>
          <Feather name="map-pin" size={14} color={theme.secondaryText || '#666'} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.projectInfo, { color: theme.secondaryText || '#666' }]}>{location || 'N/A'}</Text>
        </View>

        {/* Tags Display */}
        {tags && Array.isArray(tags) && tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScrollView}>
              {tags.slice(0, 3).map((tag, tagIndex) => (
                <View
                  key={tagIndex}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: theme.avatarBg,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.tagText,
                      { color: theme.secondaryText },
                    ]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {tags.length > 3 && (
                <View
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: theme.avatarBg,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.tagText,
                      { color: theme.secondaryText },
                    ]}>
                    +{tags.length - 3}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Container for End Date above progress */}
      <View style={styles.endDateProgressContainer}>
        <View style={styles.projectRow}>
          <Text style={[styles.projectInfo, { color: statusColor }]}>{remainingText}</Text>
        </View>
        
        {/* Tags Management Button and Progress */}
        <View style={styles.rightActions}>
          {onTagsManagement && isCreator && (
            <TouchableOpacity
              style={[
                styles.tagsButton,
                {
                  backgroundColor: theme.primary + '10',
                  borderColor: theme.primary + '20'
                }
              ]}
              onPress={() => onTagsManagement(project)}>
              <MaterialIcons name="local-offer" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          <View style={styles.progressContainer}>
            <CustomCircularProgress percentage={progress || 0} />
          </View>
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
    borderRadius: isTablet ? 16 : 14,
    marginHorizontal: isTablet ? 8 : 16,
    marginBottom: isTablet ? 10 : 10,
    padding: isTablet ? 16 : 12,
    borderWidth: 1,
    borderColor: '#e6eaf3',
  },
  projectIcon: {
    width: isTablet ? 44 : 44,
    height: isTablet ? 44 : 44,
    borderRadius: isTablet ? 14 : 12,
    backgroundColor: '#F2F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isTablet ? 14 : 14,
  },
  projectIconText: {
    color: '#366CD9',
    fontWeight: '600',
    fontSize: isTablet ? 24 : 20,
  },
  projectName: {
    color: '#222',
    fontWeight: '500',
    fontSize: isTablet ? 18 : 16,
    marginBottom: 2,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  projectInfo: {
    color: '#666',
    fontSize: isTablet ? 14 : 12,
    marginLeft: 5,
    fontWeight: '400',
    maxWidth: isTablet ? 200 : 180,
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 50,
    borderWidth: 2,
    width: isTablet ? 56 : 50,
    height: isTablet ? 56 : 50,
  },
  endDateProgressContainer: {
    alignItems: 'flex-end',
    marginLeft: isTablet ? 12 : 10,
    justifyContent: 'center',
    gap: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  tagsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    marginTop: 6,
  },
  tagsScrollView: {
    flexGrow: 0,
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0,
    marginRight: 4,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  endDateText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '500',
  },
});
