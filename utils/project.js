import apiClient from './apiClient';

export const getProjectsByUserId = async () => {
  try {
    const response = await apiClient.get('api/projects');
    const projects = response.data && response.data.projects ? response.data.projects : [];
    return Array.isArray(projects) ? projects : [];
  } catch (error) {
    console.error('Failed to fetch projects:', error.message);
    throw error;
  }
};

export const getProjectById = async (id) => {
  try {
    const response = await apiClient.get(`api/projects/${id}`);
    const project = response.data && response.data.project ? response.data.project : {};
    if (project) {
      project.issues = Array.isArray(project.issues) ? project.issues : [];
      project.worklists = Array.isArray(project.worklists) ? project.worklists : [];
    }
    return project;
  } catch (error) {
    console.error('Failed to fetch project details:', error.message);
    throw error;
  }
};

export const createProject = async (projectData) => {
  try {
    const response = await apiClient.post('api/projects/create', projectData);
    return response.data.project;
  } catch (error) {
    console.error('Create Project Error:', error.message);
    throw error;
  }
};

export const updateProject = async (id, projectData) => {
  try {
    const response = await apiClient.put(`api/projects/${id}`, projectData);
    return response.data.project;
  } catch (error) {
    console.error('Update Project Error:', error.message);
    throw error;
  }
};

export const deleteProjectById = async (id) => {
  try {
    const response = await apiClient.delete(`api/projects/${id}`);
    return response.data.message;
  } catch (error) {
    console.error('Delete Project Error:', error.message);
    throw error;
  }
};

export const updateProjectTags = async (projectId, tags) => {
  try {
    const response = await apiClient.patch(`api/projects/${projectId}/tags`, { tags });
    return response.data.project;
  } catch (error) {
    console.error('Error updating project tags:', error.message);
    throw error;
  }
};

export const transferProjectOwnership = async (projectId, newOwnerId) => {
  try {
    const response = await apiClient.post(`api/projects/${projectId}/transfer-ownership`, { newOwnerId });
    return response.data;
  } catch (error) {
    console.error('Transfer Ownership Error:', error.message);
    throw error;
  }
};

export const leaveProject = async (projectId) => {
  try {
    const response = await apiClient.post(`api/projects/${projectId}/leave`);
    return response.data;
  } catch (error) {
    console.error('Leave Project Error:', error.message);
    throw error;
  }
};

export const getTaskDependencyChartByProjectId = async (projectId) => {
  try {
    const response = await apiClient.get(`api/projects/${projectId}/dependency-chart`);
    return response.data;
  } catch (error) {
    // If the specific endpoint is not found, fallback to building it from tasks
    if (error.response && error.response.status === 404) {
      console.warn('Dependency chart endpoint 404, falling back to local generation');
      try {
        const tasksResponse = await apiClient.get(`api/tasks/${projectId}`);
        const rawTasks = tasksResponse.data.tasks || [];

        // Ensure each task has an 'id' field
        const tasks = rawTasks.map(t => ({
          ...t,
          id: String(t.id || t._id || t.taskId)
        }));

        // Generate dependencies from task data
        const dependencies = [];
        tasks.forEach(task => {
          if (task.dependentTaskIds && Array.isArray(task.dependentTaskIds)) {
            task.dependentTaskIds.forEach(depId => {
              dependencies.push({
                from: String(depId),
                to: String(task.id)
              });
            });
          }
        });

        return { tasks, dependencies };
      } catch (fallbackError) {
        console.error('Fallback Fetch Tasks Error:', fallbackError.message);
        throw fallbackError;
      }
    }
    console.error('Fetch Dependency Chart Error:', error.message);
    throw error;
  }
};