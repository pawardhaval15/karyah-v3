import { Feather } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import ProgressRing from '../ui/ProgressRing';

const getStatusInfo = (date, theme) => {
  if (!date) return { text: 'No due date', color: theme.secondaryText };

  const dueDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

  const dateStr = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (diffDays < 0) return { text: `Overdue (${dateStr})`, color: '#FF5252', isCritical: true };
  if (diffDays === 0) return { text: 'Due Today', color: '#FF9500', isCritical: true };
  if (diffDays <= 3) return { text: `Due in ${diffDays}d`, color: '#FFC107' };

  return { text: dateStr, color: theme.secondaryText };
};

const TaskCard = ({
  title,
  project,
  location,
  percent,
  theme,
  isIssue,
  issueStatus,
  date,
  isCritical,
}) => {
  const statusInfo = useMemo(() => getStatusInfo(date, theme), [date, theme]);

  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify()}
      layout={Layout.springify()}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        }
      ]}
    >
      <View style={[
        styles.container,
        { alignItems: 'flex-start' }
      ]}>
        {!isIssue && (
          <View style={styles.progressContainer}>
            <ProgressRing progress={percent} color={theme.primary} theme={theme} size={42} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="folder" size={12} color={theme.secondaryText} style={styles.icon} />
              <Text style={[styles.metaText, { color: theme.secondaryText }]} numberOfLines={1}>
                {project || 'No Project'}
              </Text>
            </View>

            {location && (
              <View style={[styles.metaItem, { marginLeft: 12 }]}>
                <Feather name="map-pin" size={12} color={theme.secondaryText} style={styles.icon} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.badgeColumn}>
          <Text style={[styles.rightDateText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>

          {isIssue ? (
            <View style={[
              styles.badge,
              { backgroundColor: isCritical ? '#FF3B3015' : '#FF950015' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: isCritical ? '#FF3B30' : '#FF9500' }
              ]}>
                {issueStatus || 'Pending'}
              </Text>
            </View>
          ) : percent === 100 ? (
            <View style={[
              styles.badge,
              { backgroundColor: '#4CAF5015' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: '#4CAF50' }
              ]}>
                Done
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 2,
  },
  container: {
    padding: 14,
    flexDirection: 'row',
  },
  progressContainer: {
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '48%',
  },
  icon: {
    marginRight: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeColumn: {
    marginLeft: 12,
    alignItems: 'flex-end',
    minWidth: 80,
  },
  rightDateText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 75,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  }
});

export default memo(TaskCard);
