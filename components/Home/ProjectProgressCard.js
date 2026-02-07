import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeInRight,
  Layout,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StatsCircle = memo(({ progress, count, theme, color, size = 32 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  useEffect(() => {
    scale.value = withSpring(1.2, { damping: 12 }, () => {
      scale.value = withSpring(1);
    });
  }, [count]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (Math.min(100, Math.max(0, animatedProgress.value)) / 100) * circumference,
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
          strokeWidth={strokeWidth} fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color || theme.primary} strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps} strokeLinecap="round" fill="transparent"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.Text style={[styles.circleCount, { color: theme.text }, animatedStyle]}>
          {count}
        </Animated.Text>
      </View>
    </View>
  );
});

const ProjectProgressCard = ({
  title,
  timeline,
  project,
  theme,
  location,
  stats
}) => {
  const navigation = useNavigation();

  // Optimized data access
  const indicators = useMemo(() => [
    { key: 'critical', count: stats?.critical?.count || 0, progress: stats?.critical?.avgProgress || 0, color: theme.criticalGradient?.[0] || '#FF3B30' },
    { key: 'issues', count: stats?.issues?.count || 0, progress: stats?.issues?.avgProgress || 0, color: theme.issueGradient?.[0] || '#FF9500' },
    { key: 'tasks', count: stats?.tasks?.count || 0, progress: stats?.tasks?.avgProgress || 0, color: theme.taskGradient?.[0] || theme.primary },
  ].filter(i => i.count > 0), [stats, theme]);

  return (
    <Animated.View
      entering={FadeInRight.duration(400).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('ProjectDetailsScreen', { project })}
        activeOpacity={0.85}
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={10} color={theme.secondaryText} />
              <Text style={[styles.metaText, { color: theme.secondaryText }]} numberOfLines={1}>
                {location || 'N/A'}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: theme.secondaryText }]}>{timeline}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.indicators}>
            {indicators.map(item => (
              <StatsCircle
                key={item.key}
                count={item.count}
                progress={item.progress}
                color={item.color}
                theme={theme}
              />
            ))}
          </View>
          <Feather name="chevron-right" size={16} color={theme.secondaryText} style={{ opacity: 0.3 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 230,
    height: 105,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginRight: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indicators: {
    flexDirection: 'row',
    gap: 12,
  },
  circleCount: {
    fontSize: 10,
    fontWeight: '900',
  }
});

export default memo(ProjectProgressCard);
