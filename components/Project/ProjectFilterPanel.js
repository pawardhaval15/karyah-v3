import { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

const ProjectFilterPanel = ({
    theme,
    t,
    filterOptions,
    filters,
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
                <TouchableOpacity onPress={clearAllFilters} hitSlop={10}>
                    <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{t('clear_all')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {/* Locations Filter */}
                {filterOptions.locations.length > 0 && (
                    <View style={styles.filterGroup}>
                        <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('locations')}</Text>
                        <View style={styles.chipsRow}>
                            {filterOptions.locations.map(loc => {
                                const isSelected = filters.locations.includes(loc);
                                return (
                                    <TouchableOpacity
                                        key={loc}
                                        onPress={() => toggleFilter('locations', loc)}
                                        style={[
                                            styles.chip,
                                            isSelected
                                                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                                : { backgroundColor: theme.background, borderColor: theme.border }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: isSelected ? '#fff' : theme.text }
                                        ]}>
                                            {loc}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Tags Filter */}
                {filterOptions.tags.length > 0 && (
                    <View style={[styles.filterGroup, { marginTop: 12 }]}>
                        <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('tags')}</Text>
                        <View style={styles.chipsRow}>
                            {filterOptions.tags.map(tag => {
                                const isSelected = filters.tags.includes(tag);
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        onPress={() => toggleFilter('tags', tag)}
                                        style={[
                                            styles.chip,
                                            isSelected
                                                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                                : { backgroundColor: theme.background, borderColor: theme.border }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: isSelected ? '#fff' : theme.text }
                                        ]}>
                                            #{tag}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    filtersPanel: {
        borderRadius: 20,
        borderWidth: 1.5,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    filterHeaderText: {
        fontSize: 16,
        fontWeight: '800',
    },
    filterGroup: {
        gap: 10,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
    },
});

export default memo(ProjectFilterPanel);
