import { create } from 'zustand';

export const useWorklistUIStore = create((set) => ({
    search: '',
    setSearch: (search) => set({ search }),

    isCreateModalVisible: false,
    setCreateModalVisible: (visible) => set({ isCreateModalVisible: visible }),

    isEditModalVisible: false,
    setEditModalVisible: (visible) => set({ isEditModalVisible: visible }),

    isProjectNameModalVisible: false,
    setProjectNameModalVisible: (visible) => set({ isProjectNameModalVisible: visible }),

    selectedWorklist: null,
    setSelectedWorklist: (worklist) => set({ selectedWorklist: worklist }),

    newWorklistName: '',
    setNewWorklistName: (name) => set({ newWorklistName: name }),

    editedWorklistName: '',
    setEditedWorklistName: (name) => set({ editedWorklistName: name }),

    resetCreateForm: () => set({ newWorklistName: '', isCreateModalVisible: false }),
    resetEditForm: () => set({ editedWorklistName: '', selectedWorklist: null, isEditModalVisible: false }),
}));
