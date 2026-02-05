import { Feather } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { useTasksByWorklist } from '../../hooks/useTasks';
import TaskList from '../Task/TaskList';
import { CircularProgress } from './ProjectStatistics';

const WorklistItem = ({
    item,
    index,
    navigation,
    progress,
    theme,
    onDelete,
    t,
    onAddTask
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const percentage = progress?.progress || 0;
    const remainingTasks = (progress?.totalTasks || 0) - (progress?.completedTasks || 0);

    const { data: tasks = [], isLoading } = useTasksByWorklist(isExpanded ? item.id : null);

    const layoutTransition = Layout.springify().damping(18).stiffness(120);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100)}
            layout={layoutTransition}
            style={styles.worklistWrapper}
        >
            <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                onLongPress={() => onDelete(item.id)}
                activeOpacity={0.9}
                style={[
                    styles.worklistCard,
                    { backgroundColor: theme.card },
                    isExpanded && [styles.worklistCardExpanded, { borderColor: theme.border }]
                ]}
            >
                <View style={styles.worklistIcon}>
                    <CircularProgress size={44} strokeWidth={4} percentage={percentage} theme={theme} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.worklistName, { color: theme.text }]} numberOfLines={1}>
                        {item.name?.toUpperCase()}
                    </Text>
                    <Text style={[styles.worklistTasks, { color: theme.secondaryText }]}>
                        {remainingTasks} {t('tasks_remaining')}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.secondaryText} />
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <Animated.View
                    entering={FadeInUp.duration(300)}
                    exiting={FadeOutUp.duration(200)}
                    layout={layoutTransition}
                    style={[styles.expansionContent, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                    <View style={[styles.expansionHeader, { borderBottomColor: theme.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.expansionHeaderText, { color: theme.secondaryText }]}>
                                Tasks & Issues in {item.name}
                            </Text>
                            <Text style={[styles.expansionHeaderCount, { color: theme.secondaryText }]}>
                                {tasks?.length || 0} {t('tasks')}
                            </Text>
                        </View>
                    </View>

                    {isLoading ? (
                        <View style={{ height: 100, justifyContent: 'center' }}>
                            <ActivityIndicator size="small" color={theme.primary} />
                        </View>
                    ) : (
                        <TaskList
                            tasks={tasks}
                            theme={theme}
                            isSelectionMode={false}
                            selectedTasks={[]}
                            onTaskPress={(task) => navigation.navigate('TaskDetails', { taskId: task.id || task._id })}
                            onSubtaskNavigate={(subtaskId) => navigation.navigate('TaskDetails', { taskId: subtaskId })}
                            activeTab="mytasks"
                            scrollEnabled={false}
                            nestedScrollEnabled={true}
                            ListEmptyComponent={
                                <View style={styles.emptyTasksContainer}>
                                    <Text style={[styles.emptyTasksText, { color: theme.secondaryText }]}>
                                        No tasks found in this worklist.
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </Animated.View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    worklistWrapper: {
        marginHorizontal: 20,
        marginBottom: 12,
    },
    worklistCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    worklistCardExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        elevation: 0,
    },
    worklistIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    worklistName: { fontSize: 15, fontWeight: '800' },
    worklistTasks: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    expansionContent: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingHorizontal: 0,
        paddingBottom: 8,
        borderWidth: 1,
        borderTopWidth: 0,
    },
    expansionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    expansionHeaderText: { fontSize: 13, fontWeight: '700' },
    expansionHeaderCount: { fontSize: 11, marginTop: 2 },
    emptyTasksContainer: { padding: 20, alignItems: 'center' },
    emptyTasksText: { fontSize: 12, fontStyle: 'italic' },
});

export default memo(WorklistItem);
