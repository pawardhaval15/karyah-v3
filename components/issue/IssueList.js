import { Feather, MaterialIcons } from '@expo/vector-icons';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const IssueItem = memo(({ item, index, onPressIssue, theme, styles, t, currentUserName, onToggleCritical, section }) => {
  const isCreatorOfIssue = currentUserName && (item.creatorName === currentUserName || item.creator?.name === currentUserName);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 20, 400)).duration(400)}
    >
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.dark ? 0.3 : 0.05,
            shadowRadius: 5,
            elevation: 2,
          },
        ]}>
        <View style={[styles.issueIcon, {
          backgroundColor: theme.avatarBg || (theme.dark ? '#333' : '#F2F6FF'),
          width: 38,
          height: 38,
          borderRadius: 19,
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
              numberOfLines={1}>
              {item.name || 'Untitled Task'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.isCritical && (
                <View style={{ backgroundColor: '#FF2700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase' }}>
                    {t('critical')}
                  </Text>
                </View>
              )}
              {item.status && (
                <View style={{
                  backgroundColor: item.status === 'Completed' ? 'rgba(57, 201, 133, 0.15)' : 'rgba(230, 117, 20, 0.1)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 0.5,
                  borderColor: item.status === 'Completed' ? '#39C985' : '#E67514',
                }}>
                  <Text style={{
                    color: item.status === 'Completed' ? '#039855' : '#E67514',
                    fontWeight: '600',
                    fontSize: 9,
                    textTransform: 'uppercase'
                  }}>
                    {item.status?.toLowerCase() || 'pending'}
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
                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }], height: 20 }}
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
    </Animated.View>
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

  const sortedIssues = useMemo(() => {
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
      return getPriority(a) - getPriority(b);
    });
  }, [issues, statusTab]);

  const renderItem = useCallback(({ item, index }) => (
    <IssueItem
      item={item}
      index={index}
      onPressIssue={onPressIssue}
      theme={theme}
      styles={styles}
      t={t}
      currentUserName={currentUserName}
      onToggleCritical={onToggleCritical}
      section={section}
    />
  ), [onPressIssue, theme, styles, t, currentUserName, onToggleCritical, section]);

  const ListHeader = () => (
    <View style={headerStyles.tabContainer}>
      {[
        { key: 'all', label: t('all'), icon: 'list', count: issues.length, color: theme.primary },
        { key: 'pending', label: t('pending'), icon: 'clock', count: issues.filter(i => i.status === 'Pending').length, color: '#FFC107' },
        { key: 'completed', label: t('completed'), icon: 'check-circle', count: issues.filter(i => i.status === 'Completed').length, color: '#039855' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onStatusFilter(tab.key)}
          style={[
            headerStyles.tab,
            {
              backgroundColor: statusTab === tab.key ? theme.primary : theme.card,
              borderColor: statusTab === tab.key ? theme.primary : theme.border,
            }
          ]}>
          <Feather name={tab.icon} size={13} color={statusTab === tab.key ? '#fff' : tab.color} />
          <Text style={[headerStyles.tabText, { color: statusTab === tab.key ? '#fff' : theme.secondaryText }]}>
            {tab.label}
          </Text>
          <Text style={[headerStyles.tabCount, { color: statusTab === tab.key ? '#fff' : tab.color }]}>
            {tab.count}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <FlatList
      data={sortedIssues}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.id?.toString() || `issue-${index}`}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      // Performance Optimizations
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Feather name="info" size={40} color={theme.secondaryText} style={{ opacity: 0.5 }} />
          <Text style={{ color: theme.secondaryText, marginTop: 10 }}>{t('no_issues_found')}</Text>
        </View>
      }
    />
  );
}

const headerStyles = {
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  tab: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabCount: { fontSize: 12, fontWeight: '700', marginLeft: 2 },
};
