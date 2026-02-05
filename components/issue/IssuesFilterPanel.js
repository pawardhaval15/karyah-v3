import { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

const FilterChip = memo(({ label, isSelected, onPress, theme }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[
            styles.chip,
            {
                backgroundColor: isSelected ? theme.primary : 'transparent',
                borderColor: isSelected ? theme.primary : theme.border,
            }
        ]}
    >
        <Text style={[styles.chipText, { color: isSelected ? '#fff' : theme.text }]}>
            {label}
        </Text>
    </TouchableOpacity>
));

const FilterGroup = memo(({ label, options, selectedValues, onToggle, theme, horizontal = false }) => {
    if (!options || options.length === 0) return null;

    const content = (
        <View style={styles.chipsRow}>
            {options.map(option => (
                <FilterChip
                    key={option}
                    label={option}
                    isSelected={selectedValues.includes(option)}
                    onPress={() => onToggle(option)}
                    theme={theme}
                />
            ))}
        </View>
    );

    return (
        <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{label}</Text>
            {horizontal ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {content}
                </ScrollView>
            ) : content}
        </View>
    );
});

const IssuesFilterPanel = ({
    theme,
    t,
    filters,
    filterOptions,
    toggleFilter,
    clearAllFilters
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
                <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={[styles.clearText, { color: theme.primary }]}>{t('clear_all')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                <View style={styles.filterOptionsContainer}>
                    <FilterGroup
                        label={t('status')}
                        options={filterOptions.statuses}
                        selectedValues={filters.status}
                        onToggle={(val) => toggleFilter('status', val)}
                        theme={theme}
                    />

                    <FilterGroup
                        label={t('projects')}
                        options={filterOptions.projects}
                        selectedValues={filters.projects}
                        onToggle={(val) => toggleFilter('projects', val)}
                        theme={theme}
                        horizontal
                    />

                    <FilterGroup
                        label={t('created_by')}
                        options={filterOptions.creators}
                        selectedValues={filters.createdBy}
                        onToggle={(val) => toggleFilter('createdBy', val)}
                        theme={theme}
                        horizontal
                    />

                    <FilterGroup
                        label={t('locations')}
                        options={filterOptions.locations}
                        selectedValues={filters.locations}
                        onToggle={(val) => toggleFilter('locations', val)}
                        theme={theme}
                        horizontal
                    />
                </View>
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
    },
    filterHeaderText: {
        fontSize: 16,
        fontWeight: '700'
    },
    clearText: {
        fontWeight: '700',
        fontSize: 13
    },
    scrollContent: {
        maxHeight: 300
    },
    filterOptionsContainer: {
        gap: 16
    },
    filterGroup: {
        gap: 8
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    horizontalScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600'
    },
});

export default memo(IssuesFilterPanel);
