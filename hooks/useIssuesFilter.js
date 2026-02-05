import { useCallback, useMemo } from 'react';

/**
 * Custom hook to handle filtering and searching logic for issues.
 * 
 * @param {Array} issues - The list of issues to filter
 * @param {String} searchQuery - Search query string
 * @param {Object} filters - Filter criteria (status, projects, createdBy, locations)
 * @returns {Object} { filteredIssues, filterOptions, getActiveFiltersCount }
 */
export const useIssuesFilter = (issues, searchQuery, filters) => {

    const getActiveFiltersCount = useCallback(() => {
        return Object.values(filters).reduce((count, arr) => count + (Array.isArray(arr) ? arr.length : 0), 0);
    }, [filters]);

    const filteredIssues = useMemo(() => {
        if (!issues) return [];

        return issues.filter(item => {
            // Search Match
            const searchText = (item.name || '').toLowerCase();
            const matchesSearch = searchText.includes(searchQuery.toLowerCase());

            // Status Match
            const matchesStatus = !filters.status?.length || filters.status.includes(item.status);

            // Project Match
            const projectName = item.project?.projectName || item.projectName || '';
            const matchesProject = !filters.projects?.length || filters.projects.includes(projectName);

            // Creator Match
            const creatorName = item.creatorName || item.creator?.name || '';
            const matchesCreator = !filters.createdBy?.length || filters.createdBy.includes(creatorName);

            // Location Match
            const location = item.project?.location || item.projectLocation || '';
            const matchesLocation = !filters.locations?.length || filters.locations.includes(location);

            return matchesSearch && matchesStatus && matchesProject && matchesCreator && matchesLocation;
        });
    }, [issues, searchQuery, filters]);

    const filterOptions = useMemo(() => {
        const statuses = new Set();
        const projectNames = new Set();
        const creators = new Set();
        const locations = new Set();

        issues?.forEach(issue => {
            if (issue.status) statuses.add(issue.status);

            const pName = issue.project?.projectName || issue.projectName;
            if (pName) projectNames.add(pName);

            const cName = issue.creatorName || issue.creator?.name;
            if (cName) creators.add(cName);

            const loc = issue.project?.location || issue.projectLocation;
            if (loc) locations.add(loc);
        });

        return {
            statuses: Array.from(statuses).sort(),
            projects: Array.from(projectNames).sort(),
            creators: Array.from(creators).sort(),
            locations: Array.from(locations).sort(),
        };
    }, [issues]);

    return {
        filteredIssues,
        filterOptions,
        getActiveFiltersCount,
    };
};
