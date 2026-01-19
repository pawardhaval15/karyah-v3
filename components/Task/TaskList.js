import { Feather, MaterialIcons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import CustomCircularProgress from '../task details/CustomCircularProgress';
import InlineSubtaskModal from './InlineSubtaskModal';

const SectionHeader = memo(({ label, count, isExpanded, onPress, theme }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 4,
                marginTop: 8,
                marginBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
            }}
        >
            <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.avatarBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
            }}>
                <Feather
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    size={16}
                    color={theme.secondaryText}
                />
            </View>
            <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: theme.text,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                flex: 1
            }}>
                {label} ({count})
            </Text>
            <View style={{
                backgroundColor: isExpanded ? theme.primary + '15' : theme.avatarBg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
            }}>
                <Text style={{ fontSize: 11, color: isExpanded ? theme.primary : theme.secondaryText, fontWeight: '700' }}>
                    {isExpanded ? 'Hide' : 'Show'}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const TaskItem = memo(({
    item,
    index,
    theme,
    isSelectionMode,
    isSelected,
    onToggleSelection,
    onPress,
    onTagsManagement,
    modalTaskId,
    onSubtaskPress,
    onCloseModal,
    onSubtaskNavigate,
    activeTab
}) => {
    const taskName = item.name || item.taskName || 'Untitled Task';

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const statusStyle = useMemo(() => {
        const s = (item.status || 'Pending').toLowerCase();
        if (s === 'completed') return { bg: '#34C759', text: '#FFFFFF', icon: '#34C759', iconBg: 'rgba(52, 199, 89, 0.1)' };
        if (s === 'reopen') return { bg: '#FF3B30', text: '#FFFFFF', icon: '#FF3B30', iconBg: 'rgba(255, 59, 48, 0.1)' };
        if (s === 'pending') return { bg: '#FF9500', text: '#FFFFFF', icon: '#FF9500', iconBg: 'rgba(255, 149, 0, 0.1)' };
        if (s === 'in progress') return { bg: '#007AFF', text: '#FFFFFF', icon: '#007AFF', iconBg: 'rgba(0, 122, 255, 0.1)' };
        return { bg: theme.avatarBg, text: theme.text, icon: theme.primary, iconBg: theme.avatarBg };
    }, [item.status, theme]);

    // Use red icon bg if it is an issue
    const iconColors = useMemo(() => {
        if (item.isIssue) return { icon: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)' };
        return { icon: statusStyle.icon, bg: statusStyle.iconBg };
    }, [item.isIssue, statusStyle]);

    return (
        <Animated.View
            entering={FadeInDown.duration(400).springify()}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify().damping(15)}
        >
            <TouchableOpacity
                onPress={() => {
                    if (isSelectionMode) {
                        onToggleSelection(item.id || item.taskId || item._id);
                    } else {
                        onPress(item);
                    }
                }}
                style={[
                    styles.taskCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderWidth: isSelected ? 2 : 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                    },
                ]}>
                {isSelectionMode && (
                    <View
                        style={[
                            styles.selectionCircle,
                            {
                                backgroundColor: isSelected ? theme.primary : 'transparent',
                                borderColor: theme.primary,
                            },
                        ]}>
                        {isSelected && <MaterialIcons name="check" size={12} color="#fff" />}
                    </View>
                )}

                {/* Left Icon Box */}
                <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: iconColors.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                }}>
                    <MaterialIcons
                        name={item.isIssue ? 'report-problem' : 'assignment'}
                        size={24}
                        color={iconColors.icon}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Middle Content */}
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={{
                                    color: theme.text,
                                    fontSize: 16,
                                    fontWeight: '700',
                                    marginBottom: 6,
                                }}>
                                {taskName}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Feather name="folder" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                                <Text style={{ color: theme.secondaryText, fontSize: 12, opacity: 0.8 }} numberOfLines={1}>
                                    {item.projectName || item.project?.projectName || item.projectTitle || 'No Project'}
                                    {item.project?.location ? ` - ${item.project.location}` : ''}
                                </Text>
                                {(item.dueDate || item.endDate) && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                                        <Text style={{ color: theme.secondaryText, fontSize: 10, marginRight: 4 }}>•</Text>
                                        <Feather name="calendar" size={10} color={theme.secondaryText} style={{ marginRight: 2 }} />
                                        <Text style={{ color: theme.secondaryText, fontSize: 11, fontWeight: '600' }}>
                                            {formatDate(item.dueDate || item.endDate)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Right Tracking Column */}
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            {/* {item.progerss === 100 || item.status === 'Completed' ? (
                                <View style={{
                                    backgroundColor: '#34C759',
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                }}>
                                    <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '800', textTransform: 'uppercase' }}>
                                        COMPLETED
                                    </Text>
                                </View>
                            ) : (
                                <View style={{
                                    backgroundColor: statusStyle.bg,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                }}>
                                    <Text style={{ fontSize: 10, color: statusStyle.text, fontWeight: '800', textTransform: 'uppercase' }}>
                                        {item.status || 'PENDING'}
                                    </Text>
                                </View>
                            )} */}

                            {/* Always Show Progress Circle */}
                            <View style={{ transform: [{ scale: 0.8 }] }}>
                                <CustomCircularProgress percentage={item.progress || 0} />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            {(modalTaskId === (item.id || item.taskId || item._id)) && !isSelectionMode && (
                <InlineSubtaskModal
                    task={item}
                    onClose={onCloseModal}
                    onSubtaskPress={onSubtaskNavigate}
                    theme={theme}
                />
            )}
        </Animated.View>
    );
});

export default function TaskList({
    tasks,
    theme,
    isSelectionMode,
    selectedTasks,
    onToggleSelection,
    onTaskPress,
    onTagsManagement,
    refreshControl,
    ListHeaderComponent,
    ListEmptyComponent,
    activeTab,
    onSubtaskNavigate
}) {
    const { t } = useTranslation();
    const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
    const [modalTaskId, setModalTaskId] = useState(null);

    const toggleExpansion = useCallback(() => {
        setIsCompletedExpanded(prev => !prev);
    }, []);

    const handleSubtaskPress = (taskId) => {
        setModalTaskId(taskId === modalTaskId ? null : taskId);
    };

    const handleCloseModal = () => setModalTaskId(null);

    const { pending, completed } = useMemo(() => {
        // A task is considered completed if progress is 100 or status is 'Completed'
        const isCompleted = (t) => (t.progress === 100 || t.status === 'Completed');

        const p = tasks.filter(t => !isCompleted(t));
        const c = tasks.filter(t => isCompleted(t));

        return { pending: p, completed: c };
    }, [tasks]);

    const listData = useMemo(() => {
        const result = [...pending];
        if (completed.length > 0) {
            result.push({ isHeader: true, id: 'completed-section-header', label: t('completed'), count: completed.length });
            if (isCompletedExpanded) {
                result.push(...completed);
            }
        }
        return result;
    }, [pending, completed, isCompletedExpanded, t]);

    const renderItem = useCallback(({ item, index }) => {
        if (item.isHeader) {
            return (
                <SectionHeader
                    label={item.label}
                    count={item.count}
                    isExpanded={isCompletedExpanded}
                    onPress={toggleExpansion}
                    theme={theme}
                />
            );
        }

        const taskId = item.id || item.taskId || item._id;
        const isSelected = selectedTasks.includes(taskId);

        return (
            <TaskItem
                item={item}
                index={index}
                theme={theme}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                onToggleSelection={onToggleSelection}
                onPress={onTaskPress}
                onTagsManagement={onTagsManagement}
                modalTaskId={modalTaskId}
                onSubtaskPress={() => handleSubtaskPress(taskId)}
                onCloseModal={handleCloseModal}
                onSubtaskNavigate={onSubtaskNavigate}
                activeTab={activeTab}
            />
        );
    }, [
        theme,
        isSelectionMode,
        selectedTasks,
        onToggleSelection,
        onTaskPress,
        onTagsManagement,
        modalTaskId,
        activeTab,
        isCompletedExpanded,
        toggleExpansion,
        onSubtaskNavigate
    ]);

    return (
        <FlatList
            data={listData}
            keyExtractor={(item, index) => {
                if (item.isHeader) return item.id;
                return String(item.id || item.taskId || item._id || `task_${index}`);
            }}
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 5 }}
            renderItem={renderItem}
            refreshControl={refreshControl}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
            removeClippedSubviews={Platform.OS === 'android'}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={11}
        />
    );
}

const styles = StyleSheet.create({
    taskCard: {
        borderRadius: 20,
        marginHorizontal: 12,
        marginBottom: 12,
        padding: 16,
        paddingTop: 16,
        paddingBottom: 16,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    selectionCircle: {
        position: 'absolute',
        top: 6,
        left: 6,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
});
