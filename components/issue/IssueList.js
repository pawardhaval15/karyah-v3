import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
export default function IssueList({
  issues,
  onPressIssue,
  navigation,
  styles,
  theme,
  section,
  onStatusFilter,
  statusTab,
  refreshControl,
  currentUserName, // Add this prop to identify current user
  onToggleCritical, // Add this prop to handle critical toggle
}) {
  // Filtering logic for task-based issues
  let filteredIssues = issues;
  if (statusTab === 'pending') {
    filteredIssues = issues.filter((i) => i.status === 'Pending');
  } else if (statusTab === 'in_progress') {
    filteredIssues = issues.filter((i) => i.status === 'In Progress');
  } else if (statusTab === 'completed') {
    filteredIssues = issues.filter((i) => i.status === 'Completed');
  }
  // console.log(issues);
  filteredIssues = filteredIssues.slice().sort((a, b) => {
    const getPriority = (issue) => {
      const isCritical = issue.isCritical === true;
      const status = issue.status;
      // Priority order:
      // 0 - Pending Critical
      // 1 - Pending Normal
      // 2 - Completed Critical
      // 3 - Completed Normal
      // 4 - Others (like In Progress)
      if (status === 'Pending') return isCritical ? 0 : 1;
      if (status === 'Completed') return isCritical ? 2 : 3;
      return 4; // In Progress or anything else
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA < priorityB) return -1;
    if (priorityA > priorityB) return 1;

    // Optional: if same priority, latest first
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const { t } = useTranslation();
  return (
    <>
      {/* Status filter tabs row (pill design) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 16,
          marginBottom: 12,
          gap: 2,
          flexWrap: 'wrap',
          rowGap: 10,
          maxWidth: '95%',
        }}>
        {[
          {
            key: 'all',
            label: t('all'),
            icon: (
              <Feather
                name="list"
                size={13}
                color={statusTab === 'all' ? '#fff' : theme.primary}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.length,
            color: theme.primary,
          },
          {
            key: 'pending',
            label: t('pending') || 'Pending',
            icon: (
              <Feather
                name="clock"
                size={13}
                color={statusTab === 'pending' ? '#fff' : '#FFC107'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.status === 'Pending').length,
            color: '#FFC107',
          },
          {
            key: 'in_progress',
            label: t('in_progress') || 'In Progress',
            icon: (
              <Feather
                name="play-circle"
                size={13}
                color={statusTab === 'in_progress' ? '#fff' : '#2563EB'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.status === 'In Progress').length,
            color: '#2563EB',
          },
          {
            key: 'completed',
            label: t('completed') || 'Completed',
            icon: (
              <Feather
                name="check-circle"
                size={13}
                color={statusTab === 'completed' ? '#fff' : '#039855'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.status === 'Completed').length,
            color: '#039855',
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onStatusFilter(tab.key)}
            style={{
              backgroundColor: statusTab === tab.key ? theme.primary : 'transparent',
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginRight: 2,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            {tab.icon}
            <Text
              style={{
                color: statusTab === tab.key ? '#fff' : theme.secondaryText,
                fontSize: 13,
                fontWeight: '500',
                marginRight: tab.count > 0 ? 4 : 0,
              }}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 5,
                  borderRadius: 10,
                  backgroundColor:
                    statusTab === tab.key ? 'rgba(255,255,255,0.3)' : tab.color + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 2,
                }}>
                <Text
                  style={{
                    color: statusTab === tab.key ? '#fff' : tab.color,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={{ marginHorizontal: 16, marginBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}>
        {filteredIssues.map((item, idx) => (
          <TouchableOpacity
            key={item.id || (item.name || 'issue') + idx}
            activeOpacity={0.8}
            onPress={() => onPressIssue(item)}>
            <View
              style={[
                styles.issueCard,
                { backgroundColor: theme.card, borderColor: theme.border, padding: 10 },
              ]}>
              <View style={[styles.issueIcon, { backgroundColor: theme.avatarBg }]}>
                <Text style={[styles.issueIconText, { color: theme.primary }]}>
                  {/* Display first letter of task name */}
                  {item.name && item.name.trim().length > 0
                    ? item.name.trim()[0].toUpperCase()
                    : '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                {/* Title Row with Tags */}
                <View style={styles.issueRow}>
                  <View style={styles.issueTitleRow}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        minHeight: 22,
                      }}>
                      <Text
                        style={[
                          styles.issueName,
                          { color: theme.text, flexShrink: 1, maxWidth: '60%' },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {/* Display task name */}
                        {item.name || 'Untitled Task'}
                      </Text>
                      {item.isCritical && (
                        <View
                          style={[
                            styles.criticalTag,
                            {
                              backgroundColor: '#FF2700',
                              paddingVertical: 1,
                              paddingHorizontal: 6,
                              borderRadius: 5,
                              marginLeft: 6,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.criticalTagText,
                              {
                                color: '#FFF',
                                fontWeight: '500',
                                fontSize: 10,
                                letterSpacing: 0.2,
                              },
                            ]}>
                            {t('critical')}
                          </Text>
                        </View>
                      )}
                      {/* Issue Status Tag */}
                      {item.status && (
                        <View
                          style={{
                            backgroundColor:
                              (item.status === 'Completed' && item.isApproved === true)
                                ? 'rgba(57, 201, 133, 0.13)'
                                : (item.status === 'Completed' && item.isApprovalNeeded === true && item.isApproved === false)
                                  ? 'rgba(255, 193, 7, 0.18)'
                                  : 'rgba(230, 117, 20, 0.08)',
                            borderRadius: 5,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            marginLeft: 6,
                            alignSelf: 'center',
                            borderWidth: 0.5,
                            borderColor:
                              (item.status === 'Completed' && item.isApproved === true)
                                ? '#039855'
                                : (item.status === 'Completed' && item.isApprovalNeeded === true && item.isApproved === false)
                                  ? '#FFC107'
                                  : '#E67514',
                            maxWidth: 90,
                          }}>
                          <Text
                            style={{
                              color:
                                (item.status === 'Completed' && item.isApproved === true)
                                  ? '#039855'
                                  : (item.status === 'Completed' && item.isApprovalNeeded === true && item.isApproved === false)
                                    ? '#FFC107'
                                    : '#E67514',
                              fontWeight: '500',
                              fontSize: 10,
                              textTransform: 'capitalize',
                              letterSpacing: 0.2,
                              flexShrink: 1,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail">
                            {/* Display appropriate status text */}
                            {item.status === 'Completed' && item.isApproved === true
                              ? 'resolved'
                              : item.status === 'Completed' && item.isApprovalNeeded === true && item.isApproved === false
                                ? 'pending approval'
                                : item.status === 'In Progress'
                                  ? 'in progress'
                                  : item.status?.toLowerCase() || 'pending'
                            }
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Critical Toggle Row - Show only for issues created by current user */}
                {section === 'created' &&
                  currentUserName &&
                  (item.creatorName === currentUserName || item.creator?.name === currentUserName) &&
                  onToggleCritical && (
                    <View style={[styles.issueRow, { marginTop: 8, marginBottom: 4 }]}>
                      <MaterialIcons
                        name="priority-high"
                        size={14}
                        color={item.isCritical ? '#FF2700' : theme.secondaryText}
                      />
                      <Text style={[styles.issueInfo, { color: theme.secondaryText, flex: 1 }]}>
                        Critical Priority
                      </Text>
                      <Switch
                        value={item.isCritical || false}
                        onValueChange={(value) => onToggleCritical(item, value)}
                        trackColor={{ false: '#ddd', true: '#FF2700' }}
                        thumbColor="#fff"
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </View>
                  )}

                {/* User Info Row */}
                <View style={styles.issueRow}>
                  <Feather name="user" size={14} color={theme.secondaryText} />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.issueInfo, { color: theme.secondaryText }]}>
                    {`Assigned by ${item.creatorName || item.creator?.name || 'N/A'}`}
                  </Text>
                </View>

                {/* Location Row */}
                <View style={styles.issueRow}>
                  <Feather name="file" size={14} color={theme.secondaryText} />
                  <Text style={[styles.issueInfo, { color: theme.secondaryText }]}>
                    {item.project?.projectName || 'No Project'}
                  </Text>
                </View>
              </View>
              <View style={styles.chevronBox}>
                <Feather name="chevron-right" size={24} color={theme.text} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}
