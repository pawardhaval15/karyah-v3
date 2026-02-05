import { memo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NotificationTabs = ({ activeTab, onTabPress, tabs, theme }) => {
    return (
        <View style={styles.tabContainer}>
            <FlatList
                data={tabs}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.key}
                contentContainerStyle={styles.scrollContent}
                renderItem={({ item }) => {
                    const isActive = activeTab === item.key;
                    return (
                        <TouchableOpacity
                            onPress={() => onTabPress(item.key)}
                            activeOpacity={0.8}
                            style={[
                                styles.tabButton,
                                isActive
                                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                    : { backgroundColor: theme.card, borderColor: theme.border }
                            ]}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: isActive ? '#FFF' : theme.text }
                            ]}>
                                {item.label}
                            </Text>
                            {item.count > 0 && (
                                <View style={[
                                    styles.badge,
                                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : theme.primary }
                                ]}>
                                    <Text style={styles.badgeText}>
                                        {item.count > 99 ? '99+' : item.count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabContainer: {
        height: 44,
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 12,
        borderWidth: 1.5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    badge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        height: 18,
        borderRadius: 9,
        minWidth: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
    },
});

export default memo(NotificationTabs);
