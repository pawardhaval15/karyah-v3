import { Feather, MaterialIcons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, LayoutAnimation, Platform, Switch, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';

const SectionHeader = memo(({ label, count, isExpanded, onPress, theme }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginTop: 8,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.avatarBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
      }}>
        <Feather
          name={isExpanded ? 'chevron-down' : 'chevron-right'}
          size={16}
          color={theme.secondaryText}
        />
      </View>
      <Text style={{
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        flex: 1
      }}>
        {label} ({count})
      </Text>
      <View style={{
        backgroundColor: isExpanded ? theme.primary + '15' : theme.avatarBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
      }}>
        <Text style={{ fontSize: 11, color: isExpanded ? theme.primary : theme.secondaryText, fontWeight: '700' }}>
          {isExpanded ? 'Hide' : 'Show'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const IssueItem = memo(({ item, index, onPressIssue, theme, styles, t, currentUserName, onToggleCritical, section }) => {
  const isCreatorOfIssue = currentUserName && (item.creatorName === currentUserName || item.creator?.name === currentUserName);

  const statusColors = useMemo(() => {
    if (item.isCritical) return { icon: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)', border: '#FF3B30' };
    if (item.status === 'Completed') return { icon: '#34C759', bg: 'rgba(52, 199, 89, 0.1)', border: '#34C759' };
    if (item.status === 'Pending') return { icon: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)', border: '#FF9500' };
    return { icon: theme.primary, bg: theme.avatarBg, border: theme.primary };
  }, [item.status, item.isCritical, theme]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const statusStyle = useMemo(() => {
    const s = item.status?.toLowerCase();
    if (s === 'completed') return { bg: '#34C759', text: '#FFFFFF' };
    if (s === 'pending') return { bg: '#FF9500', text: '#FFFFFF' };
    if (s === 'in progress') return { bg: '#007AFF', text: '#FFFFFF' };
    return { bg: theme.avatarBg, text: theme.text };
  }, [item.status, theme]);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify().damping(15)}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPressIssue(item)}
        style={[
          styles.issueCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 10,
            elevation: 2,
            borderLeftWidth: item.isCritical ? 4 : 1,
            borderLeftColor: item.isCritical ? '#FF3B30' : theme.border,
          },
        ]}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: statusColors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}>
          <MaterialIcons
            name={item.isCritical ? 'report-problem' : 'assignment'}
            size={24}
            color={statusColors.icon}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Left Content Column */}
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: '700',
                  marginBottom: 6,
                }}
                numberOfLines={1}>
                {item.name || 'Untitled Issue'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="folder" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.secondaryText, fontSize: 12, opacity: 0.8 }} numberOfLines={1}>
                  {item.project?.projectName || item.projectName || 'General'} - {item.project?.location || ''}
                </Text>
              </View>
            </View>

            {/* Right Tracking Column */}
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={{
                backgroundColor: statusStyle.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                shadowColor: statusStyle.bg,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Text style={{
                  fontSize: 10,
                  color: statusStyle.text,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {item.status || 'Pending'}
                </Text>
              </View>

              {(item.dueDate || item.endDate) && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="calendar" size={10} color={item.isCritical ? '#FF3B30' : theme.secondaryText} style={{ marginRight: 4 }} />
                  <Text style={{ color: theme.secondaryText, fontSize: 11, fontWeight: '600' }}>
                    {formatDate(item.dueDate || item.endDate)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {section === 'created' && isCreatorOfIssue && onToggleCritical && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: theme.avatarBg, padding: 8, borderRadius: 12 }}>
              <MaterialIcons
                name="priority-high"
                size={14}
                color={item.isCritical ? '#FF3B30' : theme.secondaryText}
              />
              <Text style={{
                color: theme.text,
                fontSize: 12,
                fontWeight: '600',
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
                  true: '#FF3B30'
                }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], height: 20 }}
              />
            </View>
          )}
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
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  const toggleExpansion = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCompletedExpanded(prev => !prev);
  }, []);

  const { pending, completed } = useMemo(() => {
    const p = issues.filter(i => i.status !== 'Completed');
    const c = issues.filter(i => i.status === 'Completed');

    // Sort logic within groups (Critical first, then most recent)
    const sortFn = (a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    };

    return {
      pending: p.sort(sortFn),
      completed: c.sort(sortFn)
    };
  }, [issues]);

  const listData = useMemo(() => {
    if (statusTab === 'pending') return pending;
    if (statusTab === 'completed') return completed;

    // "All" Tab Logic
    const result = [...pending];
    if (completed.length > 0) {
      result.push({ isHeader: true, id: 'completed-section-header', label: t('completed'), count: completed.length });
      if (isCompletedExpanded) {
        result.push(...completed);
      }
    }
    return result;
  }, [pending, completed, statusTab, isCompletedExpanded, t]);

  const renderItem = useCallback(({ item, index }) => {
    if (item.isHeader) {
      return (
        <SectionHeader
          label={item.label}
          count={item.count}
          isExpanded={isCompletedExpanded}
          onPress={toggleExpansion}
          theme={theme}
        />
      );
    }
    return (
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
    );
  }, [onPressIssue, theme, styles, t, currentUserName, onToggleCritical, section, isCompletedExpanded, toggleExpansion]);

  const ListHeader = () => (
    <View style={headerStyles.tabContainer}>
      <FlatList
        data={[
          { key: 'all', label: t('all'), count: issues.length },
          { key: 'pending', label: t('pending'), count: issues.filter(i => i.status === 'Pending').length },
          { key: 'completed', label: t('completed'), count: issues.filter(i => i.status === 'Completed').length },
        ]}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onStatusFilter(item.key)}
            style={[
              headerStyles.tabButton,
              statusTab === item.key
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { backgroundColor: theme.card, borderColor: theme.border }
            ]}
            activeOpacity={0.9}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: statusTab === item.key ? '#FFF' : theme.text
            }}>
              {item.label}
            </Text>
            {item.count > 0 && (
              <View style={[headerStyles.badge, { backgroundColor: statusTab === item.key ? 'rgba(255,255,255,0.2)' : theme.primary }]}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>
                  {item.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        keyExtractor={item => item.key}
        contentContainerStyle={{ paddingHorizontal: 0 }}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
      />
    </View>
  );

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.id?.toString() || `issue-${index}`}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 5 }}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={11}
      removeClippedSubviews={Platform.OS === 'android'}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', marginTop: 100 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.avatarBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Feather name="alert-circle" size={40} color={theme.secondaryText} />
          </View>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{t('no_issues_found')}</Text>
          <Text style={{ color: theme.secondaryText, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            All clear! You don't have any issues to address right now.
          </Text>
        </View>
      }
    />
  );
}

const headerStyles = {
  tabContainer: {
    height: 48,
    marginBottom: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
};
