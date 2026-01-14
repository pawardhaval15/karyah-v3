import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useProjects } from '../../hooks/useProjects';
import ProjectProgressCard from './ProjectProgressCard';

// Helper outside to avoid re-creation
const formatMinimalDateRange = (start, end) => {
    if (!start) return 'N/A';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const startStr = `${startDate.getDate()} ${startDate.toLocaleString('default', { month: 'short' })}`;
    const endStr = endDate
        ? `${endDate.getDate()} ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`
        : 'Ongoing';
    return `${startStr} – ${endStr}`;
};

const CARD_WIDTH = 240;
const CARD_MARGIN = 10;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

const ProjectSection = memo(({ navigation, theme, loading: parentLoading }) => {
    const { t } = useTranslation();
    const { data: projects = [], isLoading: projectsLoading } = useProjects();

    const loading = parentLoading || projectsLoading;

    const displayProjects = useMemo(() => {
        if (!projects) return [];

        // 1. Filter: Only pending or in-progress (exclude completed/100%)
        const filtered = projects.filter(p => {
            const status = String(p.status || '').toLowerCase();
            const progress = p.progress || 0;
            const isCompleted = status === 'completed' || status === 'finished' || progress >= 100;
            return !isCompleted;
        });

        // 2. Sort: Chronological sequence (Overdue first, then Upcoming, then others)
        // This puts earliest end dates at the top
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return [...filtered].sort((a, b) => {
            const dateA = a.endDate ? new Date(a.endDate) : null;
            const dateB = b.endDate ? new Date(b.endDate) : null;

            // Sort by date ascending (earlier dates first)
            if (dateA && dateB) return dateA - dateB;
            if (dateA && !dateB) return -1; // Specific date beats no date
            if (!dateA && dateB) return 1;

            // If neither has end date, sort by start date descending (newest projects)
            const startA = a.startDate ? new Date(a.startDate) : 0;
            const startB = b.startDate ? new Date(b.startDate) : 0;
            return startB - startA;
        });
    }, [projects]);

    const renderProjectItem = useCallback(({ item }) => (
        <ProjectProgressCard
            title={item.projectName}
            timeline={formatMinimalDateRange(item.startDate, item.endDate)}
            assignedBy={t('you')}
            avatars={[
                ...(item.mainUserProfilePhoto ? [item.mainUserProfilePhoto] : []),
                ...(Array.isArray(item.coAdminProfilePhotos)
                    ? item.coAdminProfilePhotos
                        .map(photoObj => photoObj?.profilePhoto)
                        .filter(Boolean)
                    : [])
            ]}
            progress={item.progress}
            theme={theme}
            project={item}
            creatorName={item.mainUserName || t('unknown')}
            location={item.location}
        />
    ), [theme, t]);

    const getItemLayout = useCallback((data, index) => ({
        length: ITEM_SIZE,
        offset: ITEM_SIZE * index,
        index,
    }), []);

    if (loading && displayProjects.length === 0) {
        return (
            <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary || '#366CD9'} />
            </View>
        );
    }

    if (displayProjects.length === 0) return null;

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.sectionRow}>
                <View style={styles.sectionTitleContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        {t('ongoing_projects')} <Text style={{ color: theme.text }}>{displayProjects.length}</Text>
                    </Text>
                </View>
            </View>

            <FlatList
                data={displayProjects}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, marginBottom: 20 }}
                renderItem={renderProjectItem}
                keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                getItemLayout={getItemLayout}
                initialNumToRender={3}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={true}
                decelerationRate="fast"
                snapToInterval={ITEM_SIZE}
                snapToAlignment="start"
                scrollEventThrottle={16}
            />
        </View>
    );
});

export default ProjectSection;

const styles = StyleSheet.create({
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 0,
        marginBottom: 8,
        justifyContent: 'space-between',
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 6,
    },
});
