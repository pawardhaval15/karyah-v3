import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useDashboardStats } from '../../hooks/useDashboard';
import ProgressRing from '../ui/ProgressRing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 54) / 2.3; // Even smaller width to show more cards

const StatCard = memo(({
  title,
  value,
  total,
  percent,
  gradientColors,
  screen,
  navigation,
  theme,
  index
}) => {
  const handlePress = useCallback(() => {
    if (navigation && screen) {
      navigation.navigate(screen);
    }
  }, [navigation, screen]);

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).springify()}
      style={styles.cardWrapper}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.card}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.contentRow}>
            <View style={styles.statsColumn}>
              <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
              <View style={styles.valueGroup}>
                <Text style={styles.mainValue}>{value}</Text>
                <Text style={styles.totalValue}>/{total}</Text>
              </View>
            </View>

            <View style={styles.ringContainer}>
              <ProgressRing
                progress={percent}
                color={"rgba(255,255,255,0.9)"}
                theme={{ ...theme, text: '#fff' }}
                size={36}
                strokeWidth={3}
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

const StatCardList = memo(({ navigation, theme, loading: parentLoading }) => {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const loading = parentLoading || statsLoading;

  const statData = useMemo(() => {
    if (!stats) return [];

    return [
      {
        id: 'critical',
        title: t('critical_issues'),
        value: stats.critical?.unresolved ?? 0,
        total: stats.critical?.total ?? 0,
        percent: stats.critical?.total ? Math.round(((stats.critical.total - stats.critical.unresolved) / stats.critical.total) * 100) : 0,
        gradientColors: theme.criticalGradient,
        screen: 'IssuesScreen',
      },
      {
        id: 'issues',
        title: t('issues'),
        value: stats.issues?.unresolved ?? 0,
        total: stats.issues?.total ?? 0,
        percent: stats.issues?.total ? Math.round(((stats.issues.total - stats.issues.unresolved) / stats.issues.total) * 100) : 0,
        gradientColors: theme.issueGradient,
        screen: 'IssuesScreen',
      },
      {
        id: 'tasks',
        title: t('tasks'),
        value: (stats.tasks?.inProgress ?? 0) + (stats.tasks?.pending ?? 0),
        total: stats.tasks?.total ?? 0,
        percent: stats.tasks?.total ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0,
        gradientColors: theme.taskGradient,
        screen: 'MyTasksScreen',
      },
      {
        id: 'projects',
        title: t('projects'),
        value: (stats.projects?.inProgress ?? 0) + (stats.projects?.pending ?? 0),
        total: stats.projects?.total ?? 0,
        percent: stats.projects?.total ? Math.round((stats.projects.completed / stats.projects.total) * 100) : 0,
        gradientColors: theme.projectGradient,
        screen: 'ProjectScreen',
      },
    ];
  }, [stats, t, theme]);

  const renderItem = useCallback(({ item, index }) => (
    <StatCard {...item} index={index} navigation={navigation} theme={theme} />
  ), [navigation, theme]);

  if (loading && statData.length === 0) {
    return (
      <View style={styles.loader}>
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
      contentContainerStyle={styles.listContainer}
      snapToInterval={CARD_WIDTH + 10}
      decelerationRate="fast"
    />
  );
});

const styles = StyleSheet.create({
  loader: { height: 80, justifyContent: 'center' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 10, paddingTop: 5 },
  cardWrapper: { marginRight: 10 },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    width: CARD_WIDTH,
  },
  gradientHeader: {
    padding: 12,
    height: 75, // Slim height
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsColumn: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    opacity: 0.9,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.7,
  },
  ringContainer: {
    marginLeft: 6,
  }
});

export default StatCardList;