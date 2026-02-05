import { MaterialIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

const FilterChip = memo(({ label, isSelected, onPress, theme }) => (
    <TouchableOpacity
        style={[
            styles.compactChip,
            {
                backgroundColor: isSelected ? theme.primary : 'transparent',
                borderColor: isSelected ? theme.primary : theme.border,
            },
        ]}
        onPress={onPress}
    >
        <Text
            style={[
                styles.compactChipText,
                { color: isSelected ? '#fff' : theme.text },
            ]}
            numberOfLines={1}
        >
            {label}
        </Text>
    </TouchableOpacity>
));

const FilterGroup = memo(({ label, options, selectedValues, onToggle, theme, prefix = "" }) => {
    if (!options || options.length === 0) return null;

    return (
        <View style={styles.compactFilterSection}>
            <Text style={[styles.compactFilterTitle, { color: theme.text }]}>
                {label}
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
            >
                <View style={styles.compactChipsRow}>
                    {options.map((option) => (
                        <FilterChip
                            key={option}
                            label={`${prefix}${option}`}
                            isSelected={selectedValues.includes(option)}
                            onPress={() => onToggle(option)}
                            theme={theme}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
});

const MyTasksFilterPanel = ({
    theme,
    t,
    filters,
    filterOptions,
    toggleFilter,
    clearAllFilters,
    setShowFilters,
    activeTab
}) => {
    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify()}
            style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
            <View style={styles.filterHeader}>
                <Text style={[styles.filterHeaderText, { color: theme.text }]}>{t('filters')}</Text>
                <View style={styles.filterHeaderActions}>
                    <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersBtn}>
                        <Text style={[styles.clearFiltersText, { color: theme.primary }]}>
                            {t('clear')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={16} color={theme.secondaryText} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.filtersScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
            >
                <FilterGroup
                    label={t('status')}
                    options={filterOptions.statuses}
                    selectedValues={filters.status}
                    onToggle={(val) => toggleFilter('status', val)}
                    theme={theme}
                />

                <FilterGroup
                    label={t('projects')}
                    options={filterOptions.projectOptions}
                    selectedValues={filters.projects}
                    onToggle={(val) => toggleFilter('projects', val)}
                    theme={theme}
                />

                <FilterGroup
                    label={t('location')}
                    options={filterOptions.locations}
                    selectedValues={filters.locations}
                    onToggle={(val) => toggleFilter('locations', val)}
                    theme={theme}
                />

                <FilterGroup
                    label={activeTab === 'mytasks' ? t('assigned_by') : t('assigned_to')}
                    options={filterOptions.assignedOptions}
                    selectedValues={filters.assignedTo}
                    onToggle={(val) => toggleFilter('assignedTo', val)}
                    theme={theme}
                />

                <FilterGroup
                    label="Tags"
                    options={filterOptions.tagOptions}
                    selectedValues={filters.tags}
                    onToggle={(val) => toggleFilter('tags', val)}
                    theme={theme}
                    prefix="#"
                />
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    filtersPanel: {
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    filterHeaderText: {
        fontSize: 16,
        fontWeight: '600',
    },
    filterHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    clearFiltersBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeBtn: {
        padding: 4,
    },
    filtersScrollView: {
        maxHeight: 180,
    },
    compactFilterSection: {
        marginBottom: 12,
    },
    compactFilterTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        opacity: 0.8,
    },
    horizontalScroll: {
        flexGrow: 0,
    },
    compactChipsRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 2,
    },
    compactChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        minHeight: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactChipText: {
        fontSize: 11,
        fontWeight: '500',
    },
});

export default memo(MyTasksFilterPanel);
