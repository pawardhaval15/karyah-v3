import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TaskCard({
  title,
  project,
  percent,
  theme,
  isIssue,
  issueStatus,
  creatorName,
  date,
  isCritical,
}) {
  const [showCreatorTooltip, setShowCreatorTooltip] = useState(false);

  // Get initials from creator name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  // Calculate widths for each color segment
  const yellowWidth = percent <= 33 ? percent : 33;
  const orangeWidth = percent > 33 ? (percent <= 66 ? percent - 33 : 33) : 0;
  const blueWidth = percent > 66 ? percent - 66 : 0;

  // Calculate due date status
  const getDueDateStatus = () => {
    if (!date) return null;

    const dueDate = new Date(date);
    const today = new Date();
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return {
        text: `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) !== 1 ? 's' : ''}`,
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
  };

  const dueDateStatus = getDueDateStatus();

  // Format the dueDate string nicely for display
  // For example, "Apr 25, 2024"
  const dueDate = date
    ? new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : 'No due date';
  // Hide resolved issues entirely
  if (isIssue && issueStatus === 'resolved') {
    return null;
  }
  // Hide completed tasks entirely
  if (!isIssue && percent === 100) {
    return null;
  }
  // Map statuses for better labels
  const formatIssueStatus = (status) => {
    if (!status) return '';
    if (status === 'pending_approval') return 'Unresolved';
    if (status === 'resolved') return 'Resolved';
    return status.replace(/_/g, ' ');
  };
  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: theme.card, 
        borderColor: isIssue ? '#FF7D66' : isCritical ? '#FFB366' : theme.border,
        borderLeftWidth: isIssue || isCritical ? 4 : 1,
        borderLeftColor: isIssue ? '#FF2700' : isCritical ? '#FF8C00' : theme.border,
      }
    ]}>
      {/* Issue Tag - positioned at top right */}
      {isIssue && (
        <View style={styles.issueTag}>
          <Text style={styles.issueTagText}>ISSUE</Text>
        </View>
      )}

      {/* Critical Tag - positioned at top right */}
      {isCritical && !isIssue && (
        <View style={styles.criticalTag}>
          <Text style={styles.criticalTagText}>CRITICAL</Text>
        </View>
      )}

      {/* Uncomment if you want overdue banner, currently commented out */}
      {/* {dueDateStatus && dueDateStatus.isOverdue && !(isIssue && isCritical) && (
        <View style={[styles.dueDateBanner, { backgroundColor: dueDateStatus.color }]}>
          <Text style={styles.dueDateBannerText}>{dueDateStatus.text}</Text>
        </View>
      )} */}

      <View style={styles.content}>
        <View style={styles.row}>
          <Text
            style={[styles.taskTitle, { color: theme.text }]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Creator initials circle */}
            {creatorName && (
              <TouchableOpacity
                onPress={() => setShowCreatorTooltip(!showCreatorTooltip)}
                style={[styles.initialsCircle, { backgroundColor: theme.primary }]}
                activeOpacity={0.7}>
                <Text style={styles.initialsText}>{getInitials(creatorName)}</Text>
              </TouchableOpacity>
            )}
            {isIssue ? null : (
              <Text style={[styles.progressText, { color: theme.secondaryText }]}>{percent}%</Text>
            )}
          </View>
        </View>

        {/* Creator tooltip */}
        {showCreatorTooltip && creatorName && (
          <View style={[styles.tooltip, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.tooltipText, { color: theme.text }]}>{creatorName}</Text>
          </View>
        )}
        <View style={{ width: '100%' }}>
          {/* First row: Project name and status/creator */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}>
            <Text
              style={[styles.taskSubTitle, { color: theme.secondaryText, flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {project}
            </Text>

            {/* Critical indicator for issues */}
            {isIssue && isCritical && (
              <Text style={[styles.criticalText, { color: '#FF0000' }]} numberOfLines={1}>
                Critical
              </Text>
            )}

            {isIssue && issueStatus && !isCritical && (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color:
                    issueStatus === 'resolved'
                      ? theme.primary
                      : issueStatus === 'pending_approval'
                        ? '#FFC107'
                        : '#FF6F3C',
                  fontSize: 11,
                  fontWeight: '400',
                  marginLeft: 6,
                  fontStyle: 'italic',
                  flexShrink: 0,
                  maxWidth: 80,
                }}>
                {formatIssueStatus(issueStatus)}
              </Text>
            )}
            {/* Show due date for both issues and tasks */}
            {dueDateStatus && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                <Feather
                  name="calendar"
                  size={12}
                  color={dueDateStatus.color}
                  style={{ marginRight: 2 }}
                />
                <Text
                  style={{
                    color: dueDateStatus.color,
                    fontSize: 11,
                    fontWeight: '500',
                    maxWidth: 80,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {dueDateStatus.text}
                </Text>
              </View>
            )}
            {!dueDateStatus && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                <Feather
                  name="calendar"
                  size={12}
                  color={theme.secondaryText}
                  style={{ marginRight: 2 }}
                />
                <Text
                  style={{
                    color: theme.secondaryText,
                    fontSize: 11,
                    fontWeight: '400',
                    maxWidth: 60,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  No due date
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {/* Compact thin progress bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${isIssue ? 100 : percent}%`,
              backgroundColor:
                isIssue && isCritical ? '#FF0000' : isIssue ? '#FF5252' : theme.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const CARD_HEIGHT = 68;

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 0,
    overflow: 'hidden',
    alignItems: 'stretch',
    backgroundColor: '#fff',
    height: CARD_HEIGHT,
    justifyContent: 'space-between',
    position: 'relative',
  },
  dueDateBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  issueTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF5252',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  issueTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  criticalTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  criticalTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  criticalBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: '#FF0000',
  },
  dueDateBannerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  criticalBannerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    italic: true,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 0,
    paddingBottom: 4,
  },
  taskSubTitle: {
    fontSize: 12,
    fontWeight: '400',
    flexShrink: 1,
    maxWidth: '100%',
    textAlign: 'left',
  },
  dueDateText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
    flexShrink: 0,
  },
  criticalText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
    flexShrink: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressText: {
    fontWeight: '400',
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: 2,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  progressBar: {
    height: 2,
    borderRadius: 0,
  },
  initialsCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    top: 25,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
});
