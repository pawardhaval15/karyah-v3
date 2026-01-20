import { create } from 'zustand';

export const useTaskListUIStore = create((set) => ({
    search: '',
    setSearch: (search) => set({ search }),

    modalTaskId: null,
    setModalTaskId: (id) => set({ modalTaskId: id }),

    showTaskPopup: false,
    setShowTaskPopup: (visible) => set({ showTaskPopup: visible }),

    showWorklistMenu: false,
    setShowWorklistMenu: (visible) => set({ showWorklistMenu: visible }),

    editModalVisible: false,
    setEditModalVisible: (visible) => set({ editModalVisible: visible }),

    editedWorklistName: '',
    setEditedWorklistName: (name) => set({ editedWorklistName: name }),

    taskForm: {
        taskName: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        progress: 0,
        isIssue: false,
    },
    setTaskForm: (form) => set((state) => ({ taskForm: { ...state.taskForm, ...form } })),
    resetTaskForm: () => set({
        taskForm: {
            taskName: '',
            description: '',
            assignedTo: '',
            dueDate: '',
            progress: 0,
            isIssue: false,
        },
        showTaskPopup: false
    }),
}));
