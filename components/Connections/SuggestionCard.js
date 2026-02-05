import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

const SuggestionCard = ({ item, theme, onAdd, onRemove, isSending, t }) => {
    const isAccepted = item.connectionStatus === 'accepted';
    const isPending = item.connectionStatus === 'pending' || item.added;

    return (
        <Animated.View
            entering={FadeInRight.duration(400).springify()}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
            <View style={[styles.avatarContainer, { backgroundColor: theme.background }]}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
            </View>

            <View style={styles.info}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={[styles.subtext, { color: theme.secondaryText }]} numberOfLines={1}>
                    {item.email || item.phone || t('professional_contact')}
                </Text>
            </View>

            <View style={styles.actions}>
                {isAccepted ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${theme.primary}15` }]}>
                        <Text style={[styles.statusText, { color: theme.primary }]}>{t('connected')}</Text>
                    </View>
                ) : isPending ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${theme.secondaryText}15` }]}>
                        <Text style={[styles.statusText, { color: theme.secondaryText }]}>{t('requested')}</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => onAdd(item.userId)}
                        disabled={isSending}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[theme.primary, `${theme.primary}DD`]}
                            style={styles.addBtnGradient}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="plus" size={14} color="#fff" style={{ marginRight: 4 }} />
                                    <Text style={styles.addBtnText}>{t('add')}</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => onRemove(item.id)}
                    style={styles.closeBtn}
                    hitSlop={10}
                >
                    <Feather name="x" size={18} color={theme.secondaryText} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderWidth: 1.5,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 14,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    subtext: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    addBtnGradient: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 70,
        justifyContent: 'center',
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
    },
    statusBadge: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    closeBtn: {
        marginLeft: 12,
        padding: 4,
    },
});

export default memo(SuggestionCard);
