import { Feather } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TabButton = memo(({ tab, isActive, onPress, theme }) => (
    <TouchableOpacity
        onPress={() => onPress(tab.key)}
        style={[
            styles.tabButton,
            {
                backgroundColor: isActive ? theme.primary : 'transparent',
                borderColor: theme.border,
            }
        ]}
    >
        {React.cloneElement(tab.icon, { color: isActive ? '#fff' : tab.defaultColor || theme.primary })}
        <Text
            style={[
                styles.tabText,
                { color: isActive ? '#fff' : theme.secondaryText }
            ]}
        >
            {tab.label}
        </Text>
        {tab.count > 0 && (
            <View
                style={[
                    styles.tabCountBadge,
                    {
                        backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : theme.primary + '20',
                    },
                ]}
            >
                <Text
                    style={[
                        styles.tabCountText,
                        { color: isActive ? '#fff' : theme.primary },
                    ]}
                >
                    {tab.count}
                </Text>
            </View>
        )}
    </TouchableOpacity>
));

const MyTasksTabs = ({ theme, t, activeTab, setActiveTab, taskCounts }) => {
    const tabs = [
        {
            key: 'mytasks',
            label: t('my_tasks'),
            count: taskCounts.mytasks,
            icon: <Feather name="user-check" size={15} style={{ marginRight: 4 }} />,
        },
        {
            key: 'createdby',
            label: t('created_by_me'),
            count: taskCounts.createdby,
            icon: <Feather name="edit-3" size={15} style={{ marginRight: 4 }} />,
            defaultColor: '#366CD9',
        },
    ];

    return (
        <View style={styles.tabRow}>
            {tabs.map((tab) => (
                <TabButton
                    key={tab.key}
                    tab={tab}
                    isActive={activeTab === tab.key}
                    onPress={setActiveTab}
                    theme={theme}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 4,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    tabButton: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
    },
    tabCountBadge: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabCountText: {
        fontSize: 11,
        fontWeight: '600',
    },
});

export default memo(MyTasksTabs);
