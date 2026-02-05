import { useMemo, useState } from 'react';

export const useProjectFilters = (projects) => {
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        tags: [],
        locations: [],
    });

    const filterOptions = useMemo(() => {
        const allTags = new Set();
        const allLocations = new Set();
        projects.forEach(p => {
            if (Array.isArray(p.tags)) p.tags.forEach(tag => allTags.add(tag));
            if (p.location) allLocations.add(p.location);
        });
        return {
            tags: Array.from(allTags).sort(),
            locations: Array.from(allLocations).sort()
        };
    }, [projects]);

    const filteredProjects = useMemo(() => {
        let result = projects;

        // 1. Search Logic
        if (search.trim()) {
            const lowercaseSearch = search.toLowerCase();
            result = result.filter(p => {
                const nameMatch = p?.projectName?.toLowerCase().includes(lowercaseSearch);
                const descMatch = p?.description?.toLowerCase().includes(lowercaseSearch);
                const tagsMatch = p?.tags?.some(tag => tag.toLowerCase().includes(lowercaseSearch));
                const locationMatch = p?.location?.toLowerCase().includes(lowercaseSearch);
                return nameMatch || descMatch || tagsMatch || locationMatch;
            });
        }

        // 2. Filter by Tags
        if (filters.tags.length > 0) {
            result = result.filter(p =>
                p.tags && p.tags.some(t => filters.tags.includes(t))
            );
        }

        // 3. Filter by Location
        if (filters.locations.length > 0) {
            result = result.filter(p =>
                filters.locations.includes(p.location)
            );
        }

        return result;
    }, [projects, search, filters]);

    const categorizedProjects = useMemo(() => {
        const pending = [];
        const completed = [];
        filteredProjects.forEach(p => {
            if (p.progress >= 100 || p.status?.toLowerCase() === 'completed') {
                completed.push(p);
            } else {
                pending.push(p);
            }
        });
        return { pending, completed };
    }, [filteredProjects]);

    const toggleFilter = (type, value) => {
        setFilters(prev => {
            const current = prev[type];
            const exists = current.includes(value);
            return {
                ...prev,
                [type]: exists ? current.filter(item => item !== value) : [...current, value]
            };
        });
    };

    const clearAllFilters = () => {
        setFilters({ tags: [], locations: [] });
        setSearch('');
    };

    const activeFiltersCount = filters.tags.length + filters.locations.length;

    return {
        search,
        setSearch,
        filters,
        filterOptions,
        filteredProjects,
        categorizedProjects,
        toggleFilter,
        clearAllFilters,
        activeFiltersCount
    };
};
