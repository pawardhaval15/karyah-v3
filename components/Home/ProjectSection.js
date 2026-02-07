import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useProjectStatistics } from '../../hooks/useProjects';
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

const CARD_WIDTH = 220;
const CARD_MARGIN = 10;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

const ProjectSection = memo(({ navigation, theme, loading: parentLoading }) => {
    const { t } = useTranslation();
    const { data: projectStats = [], isLoading: statsLoading } = useProjectStatistics();

    const loading = parentLoading || statsLoading;

    const displayProjects = useMemo(() => {
        if (!projectStats || !Array.isArray(projectStats)) return [];

        // 1. Filter: Only pending or in-progress (exclude completed/100%)
        const filtered = projectStats.filter(p => {
            const status = String(p.projectStatus || p.status || '').toLowerCase();
            const progress = p.overallProjectProgress || p.progress || 0;
            const isCompleted = status === 'completed' || status === 'finished' || progress >= 100;
            return !isCompleted;
        });

        // 2. Sort: Chronological sequence (Earliest end dates first)
        return [...filtered].sort((a, b) => {
            const dateA = a.endDate ? new Date(a.endDate) : null;
            const dateB = b.endDate ? new Date(b.endDate) : null;

            if (dateA && dateB) return dateA - dateB;
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;

            const startA = a.startDate ? new Date(a.startDate) : 0;
            const startB = b.startDate ? new Date(b.startDate) : 0;
            return startB - startA;
        });
    }, [projectStats]);

    const renderProjectItem = useCallback(({ item }) => {
        return (
            <ProjectProgressCard
                title={item.projectName}
                timeline={formatMinimalDateRange(item.startDate, item.endDate)}
                assignedBy={t('you')}
                avatars={[]} // Pass empty or fetch if needed separately, as stats API might not have photos
                progress={item.overallProjectProgress || item.progress}
                theme={theme}
                project={item} // Pass the item as project object
                creatorName={item.mainUserName || t('unknown')}
                location={item.location}
                stats={item} // The item ITSELF is the stats object now
            />
        );
    }, [theme, t]);

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
                keyExtractor={(item, index) => item.id || item._id || `proj-${index}`}
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
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
});
