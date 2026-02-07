import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressRing = ({ progress, color, theme, size = 40, strokeWidth = 4 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const animatedProgress = useSharedValue(0);

    useEffect(() => {
        animatedProgress.value = withTiming(progress, { duration: 1000 });
    }, [progress]);

    const animatedProps = useAnimatedProps(() => {
        const p = Math.min(100, Math.max(0, animatedProgress.value));
        const offset = circumference - (p / 100) * circumference;
        return {
            strokeDashoffset: offset,
        };
    });

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
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
                <Text style={{ fontSize: 9, fontWeight: '800', color: theme.text }}>
                    {progress}%
                </Text>
            </View>
        </View>
    );
};

export default memo(ProgressRing);
