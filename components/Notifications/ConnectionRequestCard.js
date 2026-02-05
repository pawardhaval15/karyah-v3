import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { formatTimeAgo } from '../../utils/dateUtils';

const ConnectionRequestCard = ({ req, onAccept, onReject, theme, t }) => {
    const requester = req.requester || {};
    const initials = requester.name
        ? requester.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <Animated.View
            entering={FadeInDown.duration(400).springify()}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify().damping(15)}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
            <View style={styles.cardContentRow}>
                <View style={[styles.avatarContainer, { borderColor: theme.primary, backgroundColor: theme.avatarBg }]}>
                    {requester.profilePhoto ? (
                        <Image source={{ uri: requester.profilePhoto }} style={styles.avatarImage} />
                    ) : (
                        <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.text }]}>{requester.name || 'User'}</Text>
                    <Text style={[styles.subText, { color: theme.secondaryText }]}>wants to connect</Text>
                    <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatTimeAgo(req.createdAt)}</Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            onPress={() => onAccept(req.id || req._id)}
                            style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.acceptBtnText}>{t('accept')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onReject(req.id || req._id)}
                            style={[styles.rejectBtn, { borderColor: theme.border }]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.rejectBtnText, { color: theme.secondaryText }]}>{t('reject')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 22,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    subText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '600',
        opacity: 0.6,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 14,
        gap: 10,
    },
    acceptBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
    rejectBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    rejectBtnText: {
        fontWeight: '700',
        fontSize: 13,
    },
});

export default memo(ConnectionRequestCard);
