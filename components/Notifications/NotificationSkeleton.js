import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

const NotificationSkeleton = ({ theme }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                animatedStyle
            ]}
        >
            <View style={styles.cardContentRow}>
                <View style={[styles.avatarContainer, { backgroundColor: theme.avatarBg }]} />
                <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ height: 16, backgroundColor: theme.avatarBg, width: '40%', borderRadius: 4 }} />
                    <View style={{ height: 32, backgroundColor: theme.avatarBg, width: '90%', borderRadius: 4 }} />
                    <View style={{ height: 12, backgroundColor: theme.avatarBg, width: '20%', borderRadius: 4 }} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginRight: 16,
    },
});

export default memo(NotificationSkeleton);
