import { Feather, MaterialIcons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, Switch, Text, TouchableOpacity, View } from 'react-native';

const IssueItem = memo(({ item, onPressIssue, theme, styles, t, currentUserName, onToggleCritical, section }) => {
  const isCreatorOfIssue = currentUserName && (item.creatorName === currentUserName || item.creator?.name === currentUserName);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPressIssue(item)}
      style={[
        styles.issueCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderRadius: 12,
          borderWidth: 1,
          padding: 10,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          // Glassmorphism effect if supported by theme
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.dark ? 0.3 : 0.05,
          shadowRadius: 5,
          elevation: 2,
        },
      ]}>
      <View style={[styles.issueIcon, {
        backgroundColor: theme.avatarBg || (theme.dark ? '#333' : '#F2F6FF'),
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
      }]}>
        <Text style={[styles.issueIconText, {
          color: theme.primary,
          fontSize: 16,
          fontWeight: 'bold',
        }]}>
          {item.name && item.name.trim().length > 0
            ? item.name.trim()[0].toUpperCase()
            : '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text
            style={[
              styles.issueName,
              {
                color: theme.text,
                fontSize: 14,
                fontWeight: '600',
                flex: 1,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {item.name || 'Untitled Task'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.isCritical && (
              <View
                style={{
                  backgroundColor: '#FF2700',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}>
                <Text
                  style={{
                    color: '#FFF',
                    fontWeight: 'bold',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}>
                  {t('critical')}
                </Text>
              </View>
            )}
            {item.status && (
              <View
                style={{
                  backgroundColor:
                    item.status === 'Completed'
                      ? 'rgba(57, 201, 133, 0.15)'
                      : item.status === 'Pending'
                        ? 'rgba(230, 117, 20, 0.1)'
                        : 'rgba(255, 193, 7, 0.15)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 0.5,
                  borderColor:
                    item.status === 'Completed'
                      ? '#39C985'
                      : item.status === 'Pending'
                        ? '#E67514'
                        : '#FFC107',
                }}>
                <Text
                  style={{
                    color:
                      item.status === 'Completed'
                        ? '#039855'
                        : item.status === 'Pending'
                          ? '#E67514'
                          : '#E2B100',
                    fontWeight: '600',
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                  numberOfLines={1}>
                  {item.status === 'Completed' && item.isApproved === true
                    ? 'completed'
                    : item.status === 'Completed' && item.isApprovalNeeded === true && item.isApproved === false
                      ? 'pending approval'
                      : item.status?.toLowerCase() || 'pending'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {section === 'created' && isCreatorOfIssue && onToggleCritical && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MaterialIcons
              name="priority-high"
              size={14}
              color={item.isCritical ? '#FF2700' : theme.secondaryText}
            />
            <Text style={{
              color: theme.secondaryText,
              fontSize: 11,
              marginLeft: 4,
              flex: 1
            }}>
              Critical Priority
            </Text>
            <Switch
              value={item.isCritical || false}
              onValueChange={(value) => onToggleCritical(item, value)}
              trackColor={{
                false: theme.dark ? '#3e3e3e' : '#ddd',
                true: '#FF2700'
              }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
            />
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <MaterialIcons name="folder" size={12} color={theme.primary} style={{ marginRight: 4 }} />
          <Text style={{ color: theme.secondaryText, fontSize: 11, flexShrink: 1 }} numberOfLines={1}>
            {item.project?.projectName || item.projectName || 'NA'}
          </Text>
          <View style={{ width: 1, height: 10, backgroundColor: theme.border, marginHorizontal: 8 }} />
          <MaterialIcons name="location-on" size={12} color={theme.secondaryText} style={{ marginRight: 2 }} />
          <Text style={{ color: theme.secondaryText, fontSize: 11, flexShrink: 1 }} numberOfLines={1}>
            {item.project?.location || item.projectLocation || 'NA'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function IssueList({
  issues,
  onPressIssue,
  styles,
  theme,
  section,
  onStatusFilter,
  statusTab,
  refreshControl,
  currentUserName,
  onToggleCritical,
}) {
  const { t } = useTranslation();

  const filteredIssues = React.useMemo(() => {
    let result = issues;
    if (statusTab === 'pending') {
      result = issues.filter((i) => i.status === 'Pending');
    } else if (statusTab === 'in_progress') {
      result = issues.filter((i) => i.status === 'In Progress');
    } else if (statusTab === 'completed') {
      result = issues.filter((i) => i.status === 'Completed');
    }

    return result.sort((a, b) => {
      const getPriority = (issue) => {
        const isCritical = issue.isCritical === true;
        const status = issue.status;
        if (status === 'Pending') return isCritical ? 0 : 1;
        if (status === 'Completed') return isCritical ? 2 : 3;
        return 4;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [issues, statusTab]);

  const renderItem = useCallback(({ item }) => (
    <IssueItem
      item={item}
      onPressIssue={onPressIssue}
      theme={theme}
      styles={styles}
      t={t}
      currentUserName={currentUserName}
      onToggleCritical={onToggleCritical}
      section={section}
    />
  ), [onPressIssue, theme, styles, t, currentUserName, onToggleCritical, section]);

  const keyExtractor = useCallback((item, index) => item.id?.toString() || `issue-${index}`, []);

  const ListHeader = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
        flexWrap: 'wrap',
      }}>
      {[
        { key: 'all', label: t('all'), icon: 'list', count: issues.length, color: theme.primary },
        { key: 'pending', label: t('pending'), icon: 'clock', count: issues.filter(i => i.status === 'Pending').length, color: '#FFC107' },
        { key: 'completed', label: t('completed'), icon: 'check-circle', count: issues.filter(i => i.status === 'Completed').length, color: '#039855' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onStatusFilter(tab.key)}
          activeOpacity={0.7}
          style={{
            backgroundColor: statusTab === tab.key ? theme.primary : theme.card,
            borderColor: statusTab === tab.key ? theme.primary : theme.border,
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            elevation: statusTab === tab.key ? 2 : 0,
          }}>
          <Feather
            name={tab.icon}
            size={13}
            color={statusTab === tab.key ? '#fff' : tab.color}
          />
          <Text
            style={{
              color: statusTab === tab.key ? '#fff' : theme.secondaryText,
              fontSize: 13,
              fontWeight: '600',
            }}>
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View
              style={{
                backgroundColor: statusTab === tab.key ? 'rgba(255,255,255,0.2)' : tab.color + '15',
                borderRadius: 10,
                paddingHorizontal: 5,
                minWidth: 18,
                height: 18,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: statusTab === tab.key ? '#fff' : tab.color,
                  fontSize: 10,
                  fontWeight: 'bold',
                }}>
                {tab.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <FlatList
      data={filteredIssues}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Feather name="info" size={40} color={theme.secondaryText} style={{ opacity: 0.5 }} />
          <Text style={{ color: theme.secondaryText, marginTop: 10, fontSize: 14 }}>
            {t('no_issues_found') || 'No issues found'}
          </Text>
        </View>
      }
    />
  );
}
