import { Feather, MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
}) {
  // Filtering logic
  let filteredIssues = issues;
  if (statusTab === 'critical') {
    filteredIssues = issues.filter((i) => i.isCritical);
  } else if (statusTab === 'resolved') {
    filteredIssues = issues.filter((i) => i.issueStatus === 'resolved');
  } else if (statusTab === 'unresolved') {
    filteredIssues = issues.filter((i) => i.issueStatus === 'unresolved');
  } else if (statusTab === 'pending_approval') {
    filteredIssues = issues.filter((i) => i.issueStatus === 'pending_approval');
  }
  // console.log(issues);
  filteredIssues = filteredIssues.slice().sort((a, b) => {
    // Helper to classify priority
    const getPriority = (issue) => {
      if (issue.issueStatus !== 'resolved') {
        // Unresolved
        return issue.isCritical ? 0 : 1; // critical first, then other unresolved
      }
      return 2; // resolved last
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    if (priorityA < priorityB) return -1;
    if (priorityA > priorityB) return 1;
    return 0; // same priority, keep original order
  });

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
            label: 'All',
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
            key: 'critical',
            label: 'Critical',
            icon: (
              <Feather
                name="alert-triangle"
                size={13}
                color={statusTab === 'critical' ? '#fff' : '#FF2700'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.isCritical).length,
            color: '#FF2700',
          },
          {
            key: 'resolved',
            label: 'Resolved',
            icon: (
              <Feather
                name="check-circle"
                size={13}
                color={statusTab === 'resolved' ? '#fff' : '#039855'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.issueStatus === 'resolved').length,
            color: '#039855',
          },
          {
            key: 'pending_approval',
            label: 'Pending',
            icon: (
              <Feather
                name="clock"
                size={13}
                color={statusTab === 'pending_approval' ? '#fff' : '#FFC107'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.issueStatus === 'pending_approval').length,
            color: '#FFC107',
          },
          {
            key: 'unresolved',
            label: 'Unresolved',
            icon: (
              <MaterialIcons
                name="error-outline"
                size={13}
                color={statusTab === 'unresolved' ? '#fff' : '#E67514'}
                style={{ marginRight: 2 }}
              />
            ),
            count: issues.filter((i) => i.issueStatus === 'unresolved').length,
            color: '#E67514',
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
            key={item.issueId || (item.title || item.issueTitle || 'issue') + idx}
            activeOpacity={0.8}
            onPress={() => onPressIssue(item)}>
            <View
              style={[
                styles.issueCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={[styles.issueIcon, { backgroundColor: theme.avatarBg }]}>
                <Text style={[styles.issueIconText, { color: theme.primary }]}>
                  {item.title && item.title.trim().length > 0
                    ? item.title.trim()[0].toUpperCase()
                    : item.issueTitle && item.issueTitle.trim().length > 0
                      ? item.issueTitle.trim()[0].toUpperCase()
                      : '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
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
                        {item.title || item.issueTitle || 'Untitled'}
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
                            Critical
                          </Text>
                        </View>
                      )}
                      {/* Issue Status Tag */}
                      {item.issueStatus && (
                        <View
                          style={{
                            backgroundColor:
                              item.issueStatus === 'resolved'
                                ? 'rgba(57, 201, 133, 0.13)'
                                : item.issueStatus === 'pending_approval'
                                  ? 'rgba(255, 193, 7, 0.18)'
                                  : 'rgba(230, 117, 20, 0.08)',
                            borderRadius: 5,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            marginLeft: 6,
                            alignSelf: 'center',
                            borderWidth: 0.5,
                            borderColor:
                              item.issueStatus === 'resolved'
                                ? '#039855'
                                : item.issueStatus === 'pending_approval'
                                  ? '#FFC107'
                                  : '#E67514',
                            maxWidth: 90,
                          }}>
                          <Text
                            style={{
                              color:
                                item.issueStatus === 'resolved'
                                  ? '#039855'
                                  : item.issueStatus === 'pending_approval'
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
                            {item.issueStatus.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.issueRow}>
                  <Feather name="user" size={14} color={theme.secondaryText} />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.issueInfo, { color: theme.secondaryText }]}>
                    {section === 'assigned'
                      ? `Created by ${item.creatorName || item.assignedUserName || 'N/A'}`
                      : `Assigned to ${item.assignToUserName || 'N/A'}`}
                  </Text>
                </View>
              </View>
              <View style={styles.issueRow}>
                <Feather name="map-pin" size={14} color={theme.secondaryText} />
                <Text style={[styles.issueInfo, { color: theme.secondaryText }]}>
                  {item.projectLocation || item.project?.location || 'No location'}
                </Text>
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
