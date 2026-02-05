import { Feather, Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { ActivityChart, CircularProgress, ProjectStatsCircle } from './ProjectStatistics';

const QuickActionItem = memo(({ icon, label, onPress, color, theme }) => (
    <TouchableOpacity
        style={styles.actionItem}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
            <Feather name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.actionLabel, { color: theme.secondaryText }]}>{label}</Text>
    </TouchableOpacity>
));

const ProjectHeader = ({
    projectDetails,
    projectStats,
    theme,
    onBack,
    onMenu,
    onMaterial,
    onChat,
    onDependency,
    setShowTeam,
    showTeam,
    setCreateModalVisible,
    onAddTask,
}) => {
    const [showProjectDetails, setShowProjectDetails] = useState(false);

    const criticalCount = projectStats?.critical?.count ?? 0;
    const criticalProgress = projectStats?.critical?.avgProgress ?? 0;
    const issueCount = projectStats?.issues?.count ?? 0;
    const issueProgress = projectStats?.issues?.avgProgress ?? 0;
    const taskCount = projectStats?.tasks?.count ?? 0;
    const taskProgress = projectStats?.tasks?.avgProgress ?? 0;

    const criticalColor = theme.criticalGradient ? theme.criticalGradient[0] : '#FF3B30';
    const issueColor = theme.issueGradient ? theme.issueGradient[0] : '#FF9500';
    const taskColor = theme.taskGradient ? theme.taskGradient[0] : theme.primary;

    const layoutTransition = Layout.springify().damping(18).stiffness(120);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.card }]} onPress={onBack} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>PROJECT OVERVIEW</Text>
                <TouchableOpacity onPress={onMenu} activeOpacity={0.7}>
                    <Feather name="more-vertical" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <Animated.View
                entering={FadeInUp.delay(200)}
                layout={layoutTransition}
                style={[styles.heroCard, { backgroundColor: theme.card }]}
            >
                <View style={styles.heroTop}>
                    <View style={{ marginRight: 20 }}>
                        <CircularProgress percentage={projectDetails?.progress || 0} size={100} strokeWidth={10} theme={theme} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.categoryBadge, { backgroundColor: `${theme.primary}15` }]}>
                            <Text style={[styles.categoryText, { color: theme.primary }]}>{projectDetails?.projectCategory?.toUpperCase() || 'GENERAL'}</Text>
                        </View>
                        <Text style={[styles.heroProjectName, { color: theme.text }]} numberOfLines={2}>{projectDetails?.projectName}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="calendar-outline" size={14} color={theme.secondaryText} />
                            <Text style={[styles.metaText, { color: theme.secondaryText }]}>Due: {projectDetails?.endDate?.split('T')[0] || '-'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowProjectDetails(!showProjectDetails)} style={[styles.briefToggle, { backgroundColor: `${theme.primary}10` }]} activeOpacity={0.7}>
                            <Text style={[styles.briefToggleText, { color: theme.primary }]}>{showProjectDetails ? 'Hide Brief' : 'View Brief'}</Text>
                            <Feather name={showProjectDetails ? 'chevron-up' : 'chevron-down'} size={14} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {showProjectDetails && (
                    <Animated.View
                        entering={FadeInDown.duration(300)}
                        exiting={FadeOutUp.duration(200)}
                        style={styles.heroExpansion}
                    >
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <Text style={[styles.expansionTitle, { color: theme.text }]}>Project Description</Text>
                        <Text style={[styles.expansionText, { color: theme.secondaryText }]}>{projectDetails?.description || 'No description'}</Text>
                        <View style={[styles.infoRow, { borderTopColor: theme.border }]}>
                            <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Creator:</Text>
                            <Text style={[styles.infoValue, { color: theme.text }]}>{projectDetails?.creatorName || '-'}</Text>
                        </View>
                    </Animated.View>
                )}
            </Animated.View>

            <Animated.View layout={layoutTransition} style={styles.analyticsGrid}>
                <View style={[styles.analyticsCard, { flex: 1.2, backgroundColor: theme.card }]}>
                    <Text style={[styles.cardTitle, { color: theme.secondaryText }]}>TASK STATUS</Text>
                    <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center', marginTop: 5 }}>
                        <View style={{ alignItems: 'center', gap: 4 }}>
                            <ProjectStatsCircle progress={criticalProgress} count={criticalCount} color={criticalColor} theme={theme} />
                            <Text style={{ fontSize: 8, fontWeight: '700', color: theme.secondaryText }}>CRITICAL</Text>
                        </View>
                        <View style={{ alignItems: 'center', gap: 4 }}>
                            <ProjectStatsCircle progress={issueProgress} count={issueCount} color={issueColor} theme={theme} />
                            <Text style={{ fontSize: 8, fontWeight: '700', color: theme.secondaryText }}>ISSUES</Text>
                        </View>
                        <View style={{ alignItems: 'center', gap: 4 }}>
                            <ProjectStatsCircle progress={taskProgress} count={taskCount} color={taskColor} theme={theme} />
                            <Text style={{ fontSize: 8, fontWeight: '700', color: theme.secondaryText }}>TASKS</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.analyticsCard, { flex: 1, backgroundColor: theme.card }]}>
                    <Text style={[styles.cardTitle, { color: theme.secondaryText }]}>ACTIVITY</Text>
                    <ActivityChart theme={theme} />
                </View>
            </Animated.View>

            <Animated.View layout={layoutTransition} style={styles.actionMenu}>
                <QuickActionItem icon="message-circle" label="Chat" color="#4169E1" onPress={onChat} theme={theme} />
                <QuickActionItem icon="shopping-bag" label="Material" color={theme.primary} onPress={onMaterial} theme={theme} />
                <QuickActionItem icon="users" label="Team" color="#FF1493" onPress={() => setShowTeam(!showTeam)} theme={theme} />
                <QuickActionItem icon="share-2" label="Dependency" color="#32CD32" onPress={onDependency} theme={theme} />
            </Animated.View>

            {showTeam && (
                <Animated.View
                    entering={FadeInDown.duration(300)}
                    exiting={FadeOutUp.duration(200)}
                    layout={layoutTransition}
                    style={[styles.teamExpansion, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                    <View style={styles.teamHeader}>
                        <Text style={[styles.expansionTitle, { color: theme.text }]}>Project Team</Text>
                    </View>
                    {projectDetails?.coAdmins?.length === 0 ? (
                        <Text style={{ color: theme.secondaryText, fontSize: 12 }}>No co-admins yet.</Text>
                    ) : (
                        projectDetails?.coAdmins?.map((admin, idx) => (
                            <View key={admin.id || admin._id || idx} style={[styles.memberRow, { borderTopColor: theme.border }]}>
                                <Image
                                    source={{ uri: admin.profilePhoto || `https://ui-avatars.com/api/?name=${admin.name}` }}
                                    style={[styles.memberAvatar, { backgroundColor: theme.avatarBg }]}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.memberName, { color: theme.text }]}>{admin.name}</Text>
                                    <Text style={[styles.memberRole, { color: theme.secondaryText }]}>Co-Admin</Text>
                                </View>
                            </View>
                        ))
                    )}
                </Animated.View>
            )}

            <Animated.View layout={layoutTransition} style={[styles.worklistHeader, { marginTop: 30 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Project Worklists</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.addNewButton, { backgroundColor: theme.primary }]} onPress={() => setCreateModalVisible(true)} activeOpacity={0.8}>
                        <Text style={styles.addNewText}>+ Worklist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.addNewButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary }]}
                        onPress={() => onAddTask()}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.addNewText, { color: theme.primary }]}>+ Task</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 45 : 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 1.2 },
    heroCard: {
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        elevation: 4,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    categoryText: { fontSize: 10, fontWeight: '700' },
    heroProjectName: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    metaText: { fontSize: 13 },
    briefToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start'
    },
    briefToggleText: { fontSize: 11, fontWeight: '700' },
    heroExpansion: { marginTop: 12 },
    divider: { height: 1, marginBottom: 16, opacity: 0.5 },
    expansionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    expansionText: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1 },
    infoLabel: { fontSize: 12, fontWeight: '600' },
    infoValue: { fontSize: 12, fontWeight: '700' },
    analyticsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, marginTop: 12 },
    analyticsCard: { borderRadius: 20, padding: 16, elevation: 2 },
    cardTitle: { fontSize: 8, fontWeight: '800', marginBottom: 10 },
    actionMenu: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 16, marginRight: 16, marginLeft: 16 },
    actionItem: { alignItems: 'center', gap: 8 },
    actionIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 10, fontWeight: '700' },
    teamExpansion: { marginHorizontal: 20, marginTop: 16, borderRadius: 20, padding: 16, borderWidth: 1 },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    memberName: { fontSize: 14, fontWeight: '700' },
    memberRole: { fontSize: 11 },
    worklistHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    addNewButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    addNewText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});

export default memo(ProjectHeader);
