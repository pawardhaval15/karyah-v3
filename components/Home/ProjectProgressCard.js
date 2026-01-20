import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

function formatShortDateRange(timeline) {
  if (!timeline) return '';
  return timeline.replace(
    /January|February|March|April|May|June|July|August|September|October|November|December/gi,
    (m) => m.slice(0, 3)
  );
}
const ProjectStatsCircle = memo(({ progress, count, theme, color, size = 34 }) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color || theme.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.text }}>
          {count}
        </Text>
      </View>
    </View>
  );
});

const ProjectProgressCard = memo(({
  title,
  timeline,
  avatars = [],
  progress,
  project,
  theme,
  location,
  stats
}) => {
  const navigation = useNavigation();

  const criticalCount = stats?.critical?.count ?? 0;
  const criticalProgress = stats?.critical?.avgProgress ?? 0;

  const issueCount = stats?.issues?.count ?? 0;
  const issueProgress = stats?.issues?.avgProgress ?? 0;

  const taskCount = stats?.tasks?.count ?? 0;
  const taskProgress = stats?.tasks?.avgProgress ?? 0;

  // Use the first color of the gradients from the theme
  const criticalColor = theme.criticalGradient ? theme.criticalGradient[0] : '#FF3B30';
  const issueColor = theme.issueGradient ? theme.issueGradient[0] : '#FF9500';
  const taskColor = theme.taskGradient ? theme.taskGradient[0] : theme.primary;

  return (
    <Animated.View
      entering={FadeInRight.duration(300).springify().damping(15)}
      layout={Layout.duration(200)}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('ProjectDetailsScreen', { project })}
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: theme.card,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
        activeOpacity={0.85}
      >
        <View style={styles.contentColumn}>
          <View style={styles.headerInfo}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.locationContainer}>
                <Feather name="map-pin" size={10} color={theme.secondaryText} style={{ marginRight: 3 }} />
                <Text style={[styles.locationText, { color: theme.secondaryText }]} numberOfLines={1}>
                  {location || "N/A"}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: theme.secondaryText }]}>
                {formatShortDateRange(timeline)}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.circlesGroup}>
              <ProjectStatsCircle
                progress={criticalProgress}
                count={criticalCount}
                color={criticalColor}
                theme={theme}
              />
              <ProjectStatsCircle
                progress={issueProgress}
                count={issueCount}
                color={issueColor}
                theme={theme}
              />
              <ProjectStatsCircle
                progress={taskProgress}
                count={taskCount}
                color={taskColor}
                theme={theme}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default ProjectProgressCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    width: 220,
    minHeight: 85,
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerInfo: {
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  circlesGroup: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});
