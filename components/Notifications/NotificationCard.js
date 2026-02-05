import { Feather } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { formatTimeAgo } from '../../utils/dateUtils';

const NotificationCard = ({ item, onRead, theme }) => {
    const typeInfo = useMemo(() => {
        const type = item.type?.toLowerCase();
        if (type === 'issue' || type === 'critical') {
            return { icon: 'alert-circle', color: '#EF4444', label: 'CRITICAL' };
        }
        if (type === 'task' || type === 'task_message') {
            return { icon: 'clipboard', color: theme.primary, label: 'TASK' };
        }
        if (type?.includes('project')) {
            return { icon: 'layers', color: '#F59E0B', label: 'PROJECT' };
        }
        return { icon: 'bell', color: theme.secondaryText, label: 'INFO' };
    }, [item.type, theme]);

    const isRead = item.read === true || item.isRead === true;

    return (
        <Animated.View
            entering={FadeInDown.duration(400).springify()}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify().damping(15)}
            style={[
                styles.card,
                {
                    backgroundColor: theme.card,
                    borderColor: isRead ? theme.border : `${typeInfo.color}40`,
                    borderLeftColor: typeInfo.color,
                    borderLeftWidth: isRead ? 1 : 5,
                    opacity: isRead ? 0.7 : 1
                }
            ]}
        >
            <TouchableOpacity
                onPress={() => onRead(item)}
                style={styles.cardContentRow}
                activeOpacity={0.7}
            >
                <View style={[styles.iconCircle, { backgroundColor: `${typeInfo.color}15` }]}>
                    <Feather name={typeInfo.icon} size={20} color={typeInfo.color} />
                </View>

                <View style={{ flex: 1 }}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.typeLabel, { color: typeInfo.color }]}>
                            {typeInfo.label}
                        </Text>
                        <Text style={[styles.timeText, { color: theme.secondaryText }]}>
                            {formatTimeAgo(item.createdAt)}
                        </Text>
                    </View>

                    <Text style={[styles.messageText, { color: theme.text }]} numberOfLines={2}>
                        {item.message}
                    </Text>

                    {!isRead && (
                        <View style={[styles.unreadDot, { backgroundColor: typeInfo.color }]} />
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    messageText: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: -4,
        width: 8,
        height: 8,
        borderRadius: 4,
    }
});

export default memo(NotificationCard);
