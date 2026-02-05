import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularProgress = memo(({ percentage, size = 100, strokeWidth = 8, theme }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={theme.border}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={theme.primary}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </G>
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: size * 0.22, fontWeight: '700', color: theme.text }}>{percentage}%</Text>
                <Text style={{ fontSize: size * 0.1, color: theme.primary, marginTop: -2 }}>✓</Text>
            </View>
        </View>
    );
});

export const ProjectStatsCircle = memo(({ progress = 0, count = 0, theme, color, size = 36 }) => {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    const animatedProgress = useSharedValue(0);
    const countScale = useSharedValue(1);

    useEffect(() => {
        animatedProgress.value = withTiming(progress, { duration: 1000 });
    }, [progress]);

    useEffect(() => {
        countScale.value = withSpring(1.2, { damping: 10, stiffness: 100 }, () => {
            countScale.value = withSpring(1);
        });
    }, [count]);

    const animatedProps = useAnimatedProps(() => {
        const offset = circumference - (Math.min(100, Math.max(0, animatedProgress.value)) / 100) * circumference;
        return {
            strokeDashoffset: offset,
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => ({
        transform: [{ scale: countScale.value }],
    }));

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color || theme.primary}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    fill="transparent"
                />
            </Svg>
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                <Animated.Text style={[{ fontSize: 10, fontWeight: '800', color: theme.text }, animatedTextStyle]}>
                    {count}
                </Animated.Text>
            </View>
        </View>
    );
});

export const ActivityChart = memo(({ theme }) => {
    return (
        <View style={{ height: 60, width: '100%' }}>
            <Svg width="100%" height="60" viewBox="0 0 100 40" preserveAspectRatio="none">
                <Defs>
                    <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.3" />
                        <Stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
                    </SvgGradient>
                </Defs>
                <Path
                    d="M0,35 Q10,30 20,32 T40,20 T60,25 T80,10 T100,5 V40 H0 Z"
                    fill="url(#grad)"
                />
                <Path
                    d="M0,35 Q10,30 20,32 T40,20 T60,25 T80,10 T100,5"
                    fill="none"
                    stroke={theme.primary}
                    strokeWidth="2"
                />
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <Text key={day} style={{ fontSize: 8, color: theme.secondaryText }}>{day}</Text>
                ))}
            </View>
        </View>
    );
});
