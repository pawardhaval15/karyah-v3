import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  Layout,
  useAnimatedProps,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Pure helper function moved outside to avoid re-creation
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ProgressRing = memo(({ progress, color, theme, size = 40 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference - (Math.min(100, Math.max(0, animatedProgress.value)) / 100) * circumference;
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color || theme.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: theme.text }}>
          {progress}%
        </Text>
      </View>
    </View>
  );
});

const TaskCard = ({
  title,
  project,
  location,
  percent,
  theme,
  isIssue,
  issueStatus,
  creatorName,
  date,
  isCritical,
}) => {
  const [showCreatorTooltip, setShowCreatorTooltip] = useState(false);

  // Memoize due date status calculation
  const dueDateStatus = useMemo(() => {
    if (!date) return null;

    const dueDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const formattedDate = dueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    if (daysDiff < 0) {
      return {
        text: formattedDate,
        color: '#FF5252',
        isOverdue: true,
      };
    } else if (daysDiff === 0) {
      return {
        text: 'Due Today',
        color: '#FF6F3C',
        isOverdue: false,
      };
    } else if (daysDiff <= 3) {
      return {
        text: `Due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`,
        color: '#FFC107',
        isOverdue: false,
      };
    } else {
      return {
        text: `Due in ${daysDiff} days`,
        color: theme.secondaryText,
        isOverdue: false,
      };
    }
  }, [date, theme.secondaryText]);

  const initials = useMemo(() => getInitials(creatorName), [creatorName]);

  // --- FILTERING LOGIC ---
  const statusLower = String(issueStatus || '').toLowerCase();

  // Hide resolved/completed issues
  if (isIssue && (statusLower === 'completed' || statusLower === 'resolved' || ((percent || 0) === 100 && statusLower !== 'reopen'))) {
    return null;
  }

  // Hide completed tasks
  if (!isIssue && ((percent || 0) === 100 || statusLower === 'completed')) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify()}
      layout={Layout.springify()}
      style={{ width: '100%' }}
    >
      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        }
      ]}>
        <View style={styles.contentRow}>
          {/* Left Indicator (Only for Tasks) */}
          {!isIssue && (
            <View style={{ marginRight: 12 }}>
              <ProgressRing progress={percent} color={theme.primary} theme={theme} />
            </View>
          )}

          {/* Main Content Column */}
          <View style={styles.leftColumn}>
            <Text
              style={[styles.taskTitle, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {title}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="folder" size={12} color={theme.secondaryText} style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]} numberOfLines={1}>
                  {project || 'No Project'}
                </Text>
              </View>
              {location && (
                <View style={[styles.metaItem, { marginLeft: 10 }]}>
                  <Feather name="map-pin" size={12} color={theme.secondaryText} style={styles.metaIcon} />
                  <Text style={[styles.metaText, { color: theme.secondaryText }]} numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              )}
              {dueDateStatus ? (
                <View style={styles.dateContainer}>
                  <Feather
                    name="calendar"
                    size={12}
                    color={dueDateStatus.color}
                    style={{ marginRight: 4, marginLeft: 10 }}
                  />
                  <Text
                    style={{
                      color: dueDateStatus.color,
                      fontSize: 11,
                      fontWeight: '500',
                    }}>
                    {dueDateStatus.text}
                  </Text>
                </View>
              ) : (
                <View style={styles.dateContainer}>
                  <Feather
                    name="calendar"
                    size={12}
                    color={theme.secondaryText}
                    style={{ marginRight: 4, marginLeft: 10 }}
                  />
                  <Text style={[styles.metaText, { color: theme.secondaryText }]}>
                    No due date
                  </Text>
                </View>
              )}
            </View>

            {/* Hidden/Commented bottomRow removed for cleanliness as it's now in metaRow */}
          </View>

          {/* Right Indicator (Only for Issues) */}
          {isIssue && (
            <View style={styles.rightColumn}>
              <View style={styles.ringContainer}>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isCritical
                      ? (theme.criticalBadgeBg || '#FF525220')
                      : (theme.issueBadgeBg || theme.normalIssueBadgeBg || '#FF943A20')
                  }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    {
                      color: isCritical
                        ? (theme.criticalBadgeText || '#FFFFFF')
                        : (theme.issueBadgeText || theme.normalIssueBadgeText || '#FFFFFF')
                    }
                  ]}>
                    {issueStatus || 'Open'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export default memo(TaskCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    marginBottom: 2,
  },
  contentRow: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    paddingRight: 10,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 50,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  initialsCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 9,
    fontWeight: '800',
  },
  tooltip: {
    position: 'absolute',
    bottom: 45,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
