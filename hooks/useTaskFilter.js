import { useMemo } from 'react';

export const useTaskFilter = (tasks, issues, activeTab, debouncedSearch) => {
    return useMemo(() => {
        const sourceData = activeTab === 'tasks' ? tasks : issues;
        if (!sourceData) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Initial Filtering
        let filtered = sourceData.filter(item => {
            const status = String(item.status || '').toLowerCase();
            const progress = item.percent || item.progress || 0;

            if (activeTab === 'issues') {
                const isCompleted = (status === 'completed' || status === 'resolved' || progress === 100) && status !== 'reopen';
                return !isCompleted;
            } else {
                const isCompleted = status === 'completed' || progress === 100;
                const isMarkedAsIssue = item.isIssue === true;
                return !isCompleted && !isMarkedAsIssue;
            }
        });

        // 2. Search
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            filtered = filtered.filter(item => {
                const title = (item.title || item.taskName || item.issueTitle || item.name || '').toLowerCase();
                const desc = (item.desc || item.description || '').toLowerCase();
                const project = (item.project?.projectName || item.project || item.projectName || '').toLowerCase();
                return title.includes(query) || desc.includes(query) || project.includes(query);
            });
        }

        // 3. Sorting & Limit
        return filtered
            .map(item => {
                const dateVal = new Date(item.endDate || item.dueDate || item.date || 0);
                const diff = dateVal.getTime() ? (dateVal - today) / (1000 * 3600 * 24) : null;
                return { ...item, _sortDiff: diff };
            })
            .sort((a, b) => {
                if (activeTab === 'issues') {
                    if (a.isCritical && !b.isCritical) return -1;
                    if (!a.isCritical && b.isCritical) return 1;
                }

                const diffA = a._sortDiff;
                const diffB = b._sortDiff;
                const isOverdueA = diffA !== null && diffA < 0;
                const isOverdueB = diffB !== null && diffB < 0;

                if (isOverdueA && !isOverdueB) return -1;
                if (!isOverdueA && isOverdueB) return 1;
                return (diffA ?? 999) - (diffB ?? 999);
            })
            .slice(0, 20);
    }, [tasks, issues, activeTab, debouncedSearch]);
};
