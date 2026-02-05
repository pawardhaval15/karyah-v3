import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ProjectTabs = ({ activeTab, setActiveTab, counts, theme, t }) => {
    const tabs = ['all', 'pending', 'completed'];

    return (
        <View style={styles.tabsContainer}>
            {tabs.map(tab => {
                const isActive = activeTab === tab;
                return (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.8}
                        style={[
                            styles.tabPill,
                            isActive
                                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                : { backgroundColor: theme.card, borderColor: theme.border }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: isActive ? '#fff' : theme.text }
                        ]}>
                            {t(tab)}
                            <Text style={[styles.countText, { color: isActive ? 'rgba(255,255,255,0.8)' : theme.secondaryText }]}>
                                {` ${counts[tab]}`}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginVertical: 12,
        gap: 10,
    },
    tabPill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    countText: {
        fontSize: 12,
        fontWeight: '800',
    }
});

export default memo(ProjectTabs);
