import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchUsers } from './connections';
import { getProjectsByUserId } from './project';
import { fetchMyTasks, fetchTasksCreatedByMe } from './taskUtils';
import { getWorklistsByProjectId } from './worklist';

// Smart search function that searches across multiple data types
export const performSmartSearch = async (query) => {
  if (!query || query.trim().length < 2) {
    return { results: [], totalCount: 0 };
  }

  const searchQuery = query.toLowerCase().trim();
  const results = [];

  try {
    // Search Projects
    const projects = await getProjectsByUserId();
    const projectResults = projects.filter(project => {
      const projectName = project.projectName || '';
      const description = project.description || '';
      const location = project.location || '';
      const mainUserName = project.mainUserName || '';

      return projectName.toLowerCase().includes(searchQuery) ||
        description.toLowerCase().includes(searchQuery) ||
        location.toLowerCase().includes(searchQuery) ||
        mainUserName.toLowerCase().includes(searchQuery);
    }).map(project => ({
      id: project.id,
      type: 'project',
      title: project.projectName || 'Untitled Project',
      subtitle: project.description || project.location || 'No description',
      metadata: `Created by ${project.mainUserName || 'Unknown'}`,
      data: project,
      navigationTarget: 'ProjectDetailsScreen',
      navigationParams: { project }
    }));

    results.push(...projectResults);

    // Search My Tasks
    try {
      const myTasks = await fetchMyTasks();
      const myTaskResults = myTasks.filter(task => {
        const title = task.title || '';
        const description = task.description || '';
        const projectName = task.projectName || '';

        return title.toLowerCase().includes(searchQuery) ||
          description.toLowerCase().includes(searchQuery) ||
          projectName.toLowerCase().includes(searchQuery);
      }).map(task => ({
        id: task.id,
        type: 'task',
        title: task.title || 'Untitled Task',
        subtitle: task.description || 'No description',
        metadata: `Project: ${task.projectName || 'Unknown'}`,
        data: task,
        navigationTarget: 'TaskDetailsScreen',
        navigationParams: { taskId: task.id, task }
      }));

      results.push(...myTaskResults);
    } catch (error) {
      console.log('Error searching my tasks:', error.message);
    }

    // Search Created Tasks
    try {
      const createdTasks = await fetchTasksCreatedByMe();
      const createdTaskResults = createdTasks.filter(task => {
        const title = task.title || '';
        const description = task.description || '';
        const projectName = task.projectName || '';

        return title.toLowerCase().includes(searchQuery) ||
          description.toLowerCase().includes(searchQuery) ||
          projectName.toLowerCase().includes(searchQuery);
      }).map(task => ({
        id: `created-${task.id}`,
        type: 'created-task',
        title: task.title || 'Untitled Task',
        subtitle: task.description || 'No description',
        metadata: `Created by you • Project: ${task.projectName || 'Unknown'}`,
        data: task,
        navigationTarget: 'TaskDetailsScreen',
        navigationParams: { taskId: task.id, task }
      }));

      results.push(...createdTaskResults);
    } catch (error) {
      console.log('Error searching created tasks:', error.message);
    }

    // Search Users/Connections
    try {
      const users = await searchUsers(query);
      const userResults = users.map(user => ({
        id: `user-${user.id}`,
        type: 'user',
        title: `${user.name || ''}`.trim() || 'Unknown User',
        subtitle: user.email || 'No email',
        metadata: user.phone || 'NA',
        icon: user.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
        data: user,
        navigationTarget: 'ConnectionsScreen',
        navigationParams: { userId: user.id, user }
      }));

      results.push(...userResults);
    } catch (error) {
      console.log('Error searching users:', error.message);
    }

    // Search within project worklists (for current user's projects)
    try {
      for (const project of projects) {
        const worklists = await getWorklistsByProjectId(project.id, await AsyncStorage.getItem('token'));
        const worklistResults = worklists.filter(worklist => {
          const name = worklist.name || '';
          return name.toLowerCase().includes(searchQuery);
        }).map(worklist => ({
          id: `worklist-${worklist.id}`,
          type: 'worklist',
          title: worklist.name || 'Untitled Worklist',
          subtitle: `Tasks: ${worklist.totalTasks || 0}`,
          metadata: `Project: ${project.projectName || 'Unknown'}`,
          data: { worklist, project },
          navigationTarget: 'TaskListScreen',
          navigationParams: {
            projectId: project.id,
            worklistId: worklist.id,
            worklistName: worklist.name || 'Untitled Worklist',
            projectName: project.projectName || 'Unknown Project'
          }
        }));

        results.push(...worklistResults);
      }
    } catch (error) {
      console.log('Error searching worklists:', error.message);
    }

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedResults = results.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();

      const aExactMatch = aTitle === searchQuery;
      const bExactMatch = bTitle === searchQuery;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      const aStartsWithMatch = aTitle.startsWith(searchQuery);
      const bStartsWithMatch = bTitle.startsWith(searchQuery);

      if (aStartsWithMatch && !bStartsWithMatch) return -1;
      if (!aStartsWithMatch && bStartsWithMatch) return 1;

      return aTitle.localeCompare(bTitle);
    });

    return {
      results: sortedResults,
      totalCount: sortedResults.length,
      query: searchQuery
    };

  } catch (error) {
    console.error('Error in smart search:', error.message);
    return { results: [], totalCount: 0, error: error.message };
  }
};

// Quick search suggestions for common actions
export const getQuickSearchSuggestions = () => [
  {
    id: 'my-tasks',
    type: 'suggestion',
    title: 'My Tasks',
    subtitle: 'View all tasks assigned to you',
    metadata: 'Quick access',
    navigationTarget: 'MyTasksScreen',
    navigationParams: {}
  },
  {
    id: 'my-projects',
    type: 'suggestion',
    title: 'My Projects',
    subtitle: 'View all your projects',
    metadata: 'Quick access',
    navigationTarget: 'ProjectScreen',
    navigationParams: {}
  },
  {
    id: 'notifications',
    type: 'suggestion',
    title: 'Notifications',
    subtitle: 'Check your notifications',
    metadata: 'Quick access',
    navigationTarget: 'NotificationScreen',
    navigationParams: {}
  },
  {
    id: 'connections',
    type: 'suggestion',
    title: 'Connections',
    subtitle: 'Manage your connections',
    metadata: 'Quick access',
    icon: 'connections-icon.png',
    navigationTarget: 'ConnectionsScreen',
    navigationParams: {}
  },
  {
    id: 'settings',
    type: 'suggestion',
    title: 'Settings',
    subtitle: 'App settings and preferences',
    metadata: 'Quick access',
    navigationTarget: 'SettingsScreen',
    navigationParams: {}
  }
];

export default { performSmartSearch, getQuickSearchSuggestions };
