import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useDashboardStats } from '../../hooks/useDashboard';

const StatCard = memo(({
  title,
  value,
  total,
  percent,
  gradientColors,
  screen,
  navigation,
  theme,
  extrasLine,
  index
}) => {
  const handlePress = () => {
    if (navigation && screen) {
      navigation.navigate(screen);
    }
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).springify()}
      style={{ marginRight: 12 }}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientSection}
          >
            <View style={styles.cardSubTitleRow}>
              <Text style={styles.cardSubTitleLabel}>{title}</Text>
              <Text style={styles.cardSubTitleValue}>
                {value}
                <Text style={{ color: '#fff', opacity: 0.75 }}>
                  {' '} / {total}
                </Text>
              </Text>
            </View>
          </LinearGradient>

          <View
            style={[
              styles.bottomSection,
              { backgroundColor: theme.card, borderColor: theme.border }
            ]}
          >
            <View style={styles.row}>
              <Text style={[styles.progressLabel, { color: theme.text }]}>
                {percent}%
              </Text>

              {extrasLine ? (
                <Text
                  style={[styles.cardExtra, { marginLeft: 'auto', color: theme.secondaryText }]}
                  numberOfLines={1}
                >
                  {extrasLine}
                </Text>
              ) : null}
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${percent}%`,
                    backgroundColor: theme.primary
                  }
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const StatCardList = memo(({ navigation, theme, loading: parentLoading }) => {
  const { t } = useTranslation();
  const { data: apiData, isLoading: statsLoading } = useDashboardStats();

  const loading = parentLoading || statsLoading;

  const statData = useMemo(() => {
    if (!apiData) return [];

    return [
      {
        id: 'critical_issues',
        title: t('critical_issues'),
        value: apiData.critical?.unresolved ?? 0,
        total: apiData.critical?.total ?? 0,
        percent: apiData.critical?.total
          ? Math.round((apiData.critical.unresolved / apiData.critical.total) * 100)
          : 0,
        extrasLine: `Resolved: ${apiData.critical?.resolved ?? 0}`,
        gradientColors: theme.criticalGradient, // 🔴 Critical
        screen: 'IssuesScreen',
      },
      {
        id: 'issues',
        title: t('issues'),
        value: apiData.issues?.unresolved ?? 0,
        total: apiData.issues?.total ?? 0,
        percent: apiData.issues?.total
          ? Math.round((apiData.issues.unresolved / apiData.issues.total) * 100)
          : 0,
        extrasLine: `Resolved: ${apiData.issues?.resolved ?? 0}`,
        gradientColors: theme.issueGradient, // 🟡 Issues
        screen: 'IssuesScreen',
      },
      {
        id: 'tasks',
        title: t('tasks'),
        value: (apiData.tasks?.inProgress ?? 0) + (apiData.tasks?.pending ?? 0),
        total: apiData.tasks?.total ?? 0,
        percent: apiData.tasks?.total
          ? Math.round((apiData.tasks.completed / apiData.tasks.total) * 100)
          : 0,
        extrasLine: `Pending: ${apiData.tasks?.pending ?? 0} • Done: ${apiData.tasks?.completed ?? 0}`,
        gradientColors: theme.taskGradient, // 🔵 Task
        screen: 'MyTasksScreen',
      },
      {
        id: 'projects',
        title: t('projects'),
        value: (apiData.projects?.inProgress ?? 0) + (apiData.projects?.pending ?? 0),
        total: apiData.projects?.total ?? 0,
        percent: apiData.projects?.total
          ? Math.round((apiData.projects.completed / apiData.projects.total) * 100)
          : 0,
        extrasLine: `Pending: ${apiData.projects?.pending ?? 0} • Done: ${apiData.projects?.completed ?? 0}`,
        gradientColors: theme.projectGradient, // ⚫ Project
        screen: 'ProjectScreen',
      },
    ];
  }, [apiData, t]);


  const renderItem = useCallback(
    ({ item, index }) => (
      <StatCard
        {...item}
        index={index}
        navigation={navigation}
        theme={theme}
      />
    ),
    [navigation, theme]
  );

  if (loading && statData.length === 0) {
    return (
      <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={statData}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
      initialNumToRender={3}
      maxToRenderPerBatch={2}
      windowSize={3}
      removeClippedSubviews
    />
  );
});

export default StatCardList;


const styles = StyleSheet.create({
  card: {
    width: 180,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 0,
    overflow: 'hidden',
  },
  cardSubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSubTitleLabel: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
    fontWeight: '500',
  },
  cardSubTitleValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 'auto',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  gradientSection: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardExtra: {
    color: '#000000',
    fontSize: 10,
    opacity: 0.85,
    fontWeight: '400',
  },
  bottomSection: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderColor: '#e5e7eb',
    borderWidth: 0.8,
    borderTopWidth: 0,
  },
  progressLabel: {
    color: '#222',
    fontWeight: '400',
    fontSize: 12,
    marginBottom: 2,
    marginRight: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#366CD9',
    borderRadius: 12,
  },
});