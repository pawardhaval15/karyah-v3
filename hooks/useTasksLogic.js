import { useMemo } from 'react';

/**
 * Custom hook to handle tasks filtering and sorting logic.
 * 
 * @param {Array} tasks - Initial tasks list
 * @param {String} searchQuery - Search query
 * @param {Object} filters - Current active filters
 * @param {String} activeTab - Current active tab (mytasks / createdby)
 * @returns {Object} { filteredTasks, filterOptions }
 */
export const useTasksLogic = (tasks, searchQuery, filters, activeTab) => {

    // Sort logic within groups (Pending first, then Completed/Progress first, then Date)
    const sortedTasks = useMemo(() => {
        if (!tasks) return [];
        const data = [...tasks];

        return data.sort((a, b) => {
            const isCompletedA = a.progress === 100 || a.status === 'Completed';
            const isCompletedB = b.progress === 100 || b.status === 'Completed';

            // 1. Pending first, Completed last
            if (isCompletedA && !isCompletedB) return 1;
            if (!isCompletedA && isCompletedB) return -1;

            // 2. Sorting by Date (Oldest/Overdue first -> Future)
            const dateAStr = a.endDate || a.dueDate;
            const dateBStr = b.endDate || b.dueDate;
            const dateA = dateAStr ? new Date(dateAStr).getTime() : null;
            const dateB = dateBStr ? new Date(dateBStr).getTime() : null;

            const hasDateA = dateA && !isNaN(dateA);
            const hasDateB = dateB && !isNaN(dateB);

            if (hasDateA && hasDateB) {
                return dateA - dateB;
            }
            if (hasDateA && !hasDateB) return -1;
            if (!hasDateA && hasDateB) return 1;

            // 3. Both no date: Sort by creation (newest first)
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [tasks]);

    // Filtering logic
    const filteredTasks = useMemo(() => {
        return sortedTasks.filter((task) => {
            // Search Match
            const taskName = (task.name || task.taskName || '').toLowerCase();
            const projectName = (task.project?.name || task.project?.projectName || task.projectTitle || '').toLowerCase();
            const searchMatch = taskName.includes(searchQuery.toLowerCase()) || projectName.includes(searchQuery.toLowerCase());

            // Status Match
            const taskStatus = task.status || (task.mode === 'WORKFLOW' ? 'Active Workflow' : 'Pending');
            const statusMatch = !filters.status?.length || filters.status.includes(taskStatus);

            // Project Match
            const taskProjectName = task.project?.name || task.project?.projectName || 'No Project';
            const projectMatch = !filters.projects?.length || filters.projects.includes(taskProjectName);

            // Assigned/Creator Match
            let assignedMatch = true;
            if (filters.assignedTo?.length > 0) {
                if (activeTab === 'mytasks') {
                    const creatorName = task.creator?.name || task.creator?.username || task.creatorName;
                    assignedMatch = filters.assignedTo.includes(creatorName);
                } else {
                    assignedMatch = task.assignedUserDetails?.some(user => filters.assignedTo.includes(user.name)) || false;
                }
            }

            // Location Match
            const location = task.project?.location || '';
            const locationMatch = !filters.locations?.length || filters.locations.includes(location);

            // Tags Match
            const tagsMatch = !filters.tags?.length || task.tags?.some(tag => filters.tags.includes(tag));

            // Category & Mode Match
            const categoryMatch = !filters.category?.length || filters.category.includes(task.category);
            const modeMatch = !filters.mode?.length || filters.mode.includes(task.mode);

            return searchMatch && statusMatch && projectMatch && assignedMatch && locationMatch && tagsMatch && categoryMatch && modeMatch;
        });
    }, [sortedTasks, searchQuery, filters, activeTab]);

    // Generate option lists for filters
    const filterOptions = useMemo(() => {
        const uniqueStatuses = new Set();
        const uniqueProjects = new Set();
        const uniquePeople = new Set();
        const uniqueLocations = new Set();
        const uniqueTags = new Set();
        const uniqueCategories = new Set();
        const uniqueModes = new Set();

        tasks?.forEach(t => {
            uniqueStatuses.add(t.status || (t.mode === 'WORKFLOW' ? 'Active Workflow' : 'Pending'));
            uniqueProjects.add(t.project?.name || t.project?.projectName || 'No Project');

            if (activeTab === 'mytasks') {
                const name = t.creator?.name || t.creator?.username || t.creatorName;
                if (name) uniquePeople.add(name);
            } else {
                t.assignedUserDetails?.forEach(u => u.name && uniquePeople.add(u.name));
            }

            if (t.project?.location) uniqueLocations.add(t.project.location);
            t.tags?.forEach(tag => tag && uniqueTags.add(tag));
            if (t.category) uniqueCategories.add(t.category);
            if (t.mode) uniqueModes.add(t.mode);
        });

        return {
            statuses: Array.from(uniqueStatuses).sort(),
            projectOptions: Array.from(uniqueProjects).sort(),
            assignedOptions: Array.from(uniquePeople).sort(),
            locations: Array.from(uniqueLocations).sort(),
            tagOptions: Array.from(uniqueTags).sort(),
            categoryOptions: Array.from(uniqueCategories).sort(),
            modeOptions: Array.from(uniqueModes).sort()
        };
    }, [tasks, activeTab]);

    return {
        filteredTasks,
        filterOptions
    };
};
