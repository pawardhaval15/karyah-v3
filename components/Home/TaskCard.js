import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function TaskCard({ title, project, percent, theme, isIssue, issueStatus, creatorName, date, isCritical }) {
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
        isOverdue: true
      };
    } else if (daysDiff === 0) {
      return {
        text: 'Due Today',
        color: '#FF6F3C',
        isOverdue: false
      };
    } else if (daysDiff <= 3) {
      return {
        text: `Due in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`,
        color: '#FFC107',
        isOverdue: false
      };
    } else {
      return {
        text: `Due in ${daysDiff} days`,
        color: theme.secondaryText,
        isOverdue: false
      };
    }
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>

      {dueDateStatus && dueDateStatus.isOverdue && !(isIssue && isCritical) && (
        <View style={[styles.dueDateBanner, { backgroundColor: dueDateStatus.color }]}>
          <Text style={styles.dueDateBannerText}>{dueDateStatus.text}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.row}>
          <Text
            style={[
              styles.taskTitle,
              { color: theme.text },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {isIssue ? null : (
            <Text style={[styles.progressText, { color: theme.secondaryText }]}>{percent}%</Text>
          )}
        </View>
        <View style={{ width: '100%' }}>
          {/* First row: Project name and status/creator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text
              style={[styles.taskSubTitle, { color: theme.secondaryText, flex: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {project}
            </Text>

            {/* Critical indicator for issues */}
            {isIssue && isCritical && (
              <Text
                style={[
                  styles.criticalText,
                  { color: '#FF0000' }
                ]}
                numberOfLines={1}
              >
                Critical
              </Text>
            )}

            {isIssue && issueStatus && !isCritical && (
              <Text numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color:
                    issueStatus === 'resolved' ? theme.primary :
                      issueStatus === 'pending_approval' ? '#FFC107' :
                        '#FF6F3C',
                  fontSize: 11,
                  fontWeight: '400',
                  textTransform: 'capitalize',
                  marginLeft: 6,
                  fontStyle: 'italic',
                  flexShrink: 0,
                  maxWidth: 60,
                }}>
                {issueStatus.replace(/_/g, ' ')}
              </Text>
            )}
            {!isIssue && dueDateStatus && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                <Feather name="calendar" size={12} color={dueDateStatus.color} style={{ marginRight: 2 }} />
                <Text style={{ color: dueDateStatus.color, fontSize: 11, fontWeight: '500', maxWidth: 80 }} numberOfLines={1} ellipsizeMode="tail">
                  {dueDateStatus.text}
                </Text>
              </View>
            )}
            {!isIssue && !dueDateStatus && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                <Feather name="calendar" size={12} color={theme.secondaryText} style={{ marginRight: 2 }} />
                <Text style={{ color: theme.secondaryText, fontSize: 11, fontWeight: '400', maxWidth: 60 }} numberOfLines={1} ellipsizeMode="tail">
                  No due date
                </Text>
              </View>
            )}
          </View>

          {/* Second row: Due date info - only for issues */}
          {isIssue && dueDateStatus && !dueDateStatus.isOverdue && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="calendar" size={12} color={dueDateStatus.color} style={{ marginRight: 4 }} />
              <Text
                style={[
                  styles.dueDateText,
                  { color: dueDateStatus.color, fontSize: 11 }
                ]}
                numberOfLines={1}
              >
                {dueDateStatus.text}
              </Text>
            </View>
          )}
        </View>
      </View>
      {/* Compact thin progress bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${isIssue ? 100 : percent}%`,
              backgroundColor: isIssue && isCritical ? '#FF0000' : isIssue ? '#FF5252' : theme.primary
            }
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
    letterSpacing: 0.5,
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
});