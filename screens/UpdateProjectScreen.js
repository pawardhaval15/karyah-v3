import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import GradientButton from '../components/Login/GradientButton';
import DateBox from '../components/task details/DateBox';
import { useProjectDetails, useUpdateProject } from '../hooks/useProjects';
import { useTheme } from '../theme/ThemeContext';
import categoriesData from '../utils/categories.json';
import { getUserConnections, searchUsers } from '../utils/connections';

export default function UpdateProjectScreen({ route, navigation }) {
  const { projectId } = route.params;
  const theme = useTheme();
  const { t } = useTranslation();

  // React Query Hooks for optimized data fetching and mutations
  const { data: project, isLoading: projectLoading } = useProjectDetails(projectId);
  const updateProjectMutation = useUpdateProject();

  const [values, setValues] = useState({
    projectName: '',
    projectDesc: '',
    projectCategory: '',
    location: '',
    startDate: '',
    endDate: '',
  });
  const [selectedCoAdmins, setSelectedCoAdmins] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [allConnections, setAllConnections] = useState([]);
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showCoAdminPicker, setShowCoAdminPicker] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Sync state with project data when it loads
  useEffect(() => {
    if (project) {
      setValues({
        projectName: project.projectName || '',
        projectDesc: project.description || '',
        projectCategory: project.projectCategory || '',
        location: project.location || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
      });
      setSelectedCoAdmins(project.coAdmins?.map((u) => u.userId || u.id) || []);
    }
  }, [project]);

  // Optimized user merging logic: pool from original project co-admins, local connections, and search results
  const mergedUsers = useMemo(() => {
    const userMap = new Map();

    // 1. Add current project co-admins to base pool (ensures they stay visible even if not in connections)
    (project?.coAdmins || []).forEach(ca => {
      const id = ca.userId || ca.id;
      userMap.set(String(id), { ...ca, connectionStatus: 'accepted' });
    });

    // 2. Add local connections
    allConnections.forEach(conn => {
      const id = conn.userId || conn.id;
      if (!userMap.has(String(id))) {
        userMap.set(String(id), { ...conn, connectionStatus: 'accepted' });
      }
    });

    // 3. Add searched users
    searchedUsers.forEach(user => {
      const id = user.userId || user.id;
      if (!userMap.has(String(id))) {
        userMap.set(String(id), user);
      }
    });

    const allPool = Array.from(userMap.values());

    // If no search text, show selected users first, then others
    if (!searchText.trim()) {
      return allPool.sort((a, b) => {
        const aSel = selectedCoAdmins.some(sid => sid == (a.userId || a.id));
        const bSel = selectedCoAdmins.some(sid => sid == (b.userId || b.id));
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return 0;
      });
    }

    const searchLower = searchText.toLowerCase();
    return allPool.filter(u =>
      (u.name || '').toLowerCase().includes(searchLower) ||
      String(u.userId || u.id).includes(searchText)
    );
  }, [project, allConnections, searchedUsers, searchText, selectedCoAdmins]);

  // Category search logic
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);

  const filterCategories = (text) => {
    if (!text?.trim()) {
      setShowCategorySuggestions(false);
      return;
    }
    const search = text.toLowerCase();
    const filtered = [];
    categoriesData.categories.forEach(cat => {
      if (cat.name.toLowerCase().includes(search)) {
        filtered.push({ text: cat.name, type: 'category', subtext: 'Main Category' });
      }
      cat.subcategories.forEach(sub => {
        if (sub.toLowerCase().includes(search)) {
          filtered.push({ text: sub, type: 'subcategory', subtext: cat.name });
        }
      });
    });
    setCategorySuggestions(filtered.slice(0, 8));
    setShowCategorySuggestions(filtered.length > 0);
  };

  useFocusEffect(
    useCallback(() => {
      const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [])
  );

  useEffect(() => {
    if (showCoAdminPicker) {
      getUserConnections().then(setAllConnections).catch(() => setAllConnections([]));
    }
  }, [showCoAdminPicker]);

  useEffect(() => {
    if (!searchText.trim() || searchText.length < 2) {
      setSearchedUsers([]);
      return;
    }
    const performSearch = async () => {
      try {
        setSearchingUsers(true);
        const users = await searchUsers(searchText);
        setSearchedUsers(users || []);
      } catch (error) {
        setSearchedUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    };
    const timer = setTimeout(performSearch, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        projectData: {
          ...values,
          description: values.projectDesc,
          coAdminIds: selectedCoAdmins,
        },
      });
      Alert.alert('Success', 'Project updated successfully.');
      navigation.replace('ProjectDetailsScreen', { projectId, refresh: true });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update project.');
    }
  };

  const handleUserSelection = (user) => {
    const id = user.userId || user.id;
    setSelectedCoAdmins((prev) =>
      prev.some(i => i == id) ? prev.filter((i) => i != id) : [...prev, id]
    );
  };

  if (projectLoading && !project) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 12, fontWeight: '600' }}>{t('loading')}...</Text>
      </View>
    );
  }

  if (!project) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>

        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{values.projectName || project.projectName}</Text>
            <Text style={styles.dueDate}>
              {t('due_date')} : {values.endDate?.split('T')[0] || '-'}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Feather name="edit-3" size={24} color="#fff" opacity={0.5} />
          </View>
        </LinearGradient>

        <View style={styles.dateRow}>
          <DateBox
            label={t('start_date')}
            value={values.startDate}
            onChange={(date) => handleChange('startDate', date.toISOString())}
            theme={theme}
          />
          <DateBox
            label={t('end_date')}
            value={values.endDate}
            onChange={(date) => handleChange('endDate', date.toISOString())}
            theme={theme}
          />
        </View>

        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>{t('project_name')}</Text>
          <TextInput
            value={values.projectName}
            placeholder={t('project_name')}
            placeholderTextColor={theme.secondaryText}
            onChangeText={(text) => handleChange('projectName', text)}
            style={[styles.inputValue, { color: theme.text }]}
          />
        </View>

        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>{t('category')}</Text>
          <View style={styles.categoryInputContainer}>
            <TextInput
              value={values.projectCategory}
              placeholder={t('category')}
              placeholderTextColor={theme.secondaryText}
              onChangeText={(text) => {
                handleChange('projectCategory', text);
                filterCategories(text);
              }}
              onFocus={() => filterCategories(values.projectCategory)}
              onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
              style={[styles.inputValue, { color: theme.text }]}
            />
            {showCategorySuggestions && (
              <View style={[styles.suggestionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled>
                  {categorySuggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                      onPress={() => {
                        handleChange('projectCategory', s.text);
                        setShowCategorySuggestions(false);
                      }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.suggestionText, { color: theme.text }]}>{s.text}</Text>
                        <Text style={[styles.suggestionSubtext, { color: theme.secondaryText }]}>{s.subtext}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>{t('location')}</Text>
          <TextInput
            value={values.location}
            placeholder={t('location')}
            placeholderTextColor={theme.secondaryText}
            onChangeText={(text) => handleChange('location', text)}
            style={[styles.inputValue, { color: theme.text }]}
          />
        </View>

        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>{t('description')}</Text>
          <TextInput
            value={values.projectDesc}
            placeholder={t('description')}
            placeholderTextColor={theme.secondaryText}
            onChangeText={(text) => handleChange('projectDesc', text)}
            multiline
            style={[styles.inputValue, { color: theme.text, minHeight: 80, textAlignVertical: 'top' }]}
          />
        </View>

        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>{t('co_admins')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowCoAdminPicker(true)}
            style={styles.coAdminPreview}>
            {selectedCoAdmins.length === 0 && <Text style={{ color: theme.secondaryText }}>{t('select_co_admins')}</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {selectedCoAdmins.map((id) => {
                const u = (project?.coAdmins || []).concat(allConnections).find(x => (x.userId || x.id) == id);
                return (
                  <View key={id} style={[styles.adminChip, { backgroundColor: theme.primary + '15' }]}>
                    <Image
                      source={{ uri: u?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                      style={styles.adminChipAvatar}
                    />
                    <Text style={[styles.adminChipName, { color: theme.text }]} numberOfLines={1}>{u?.name || 'User'}</Text>
                  </View>
                );
              })}
              <View style={[styles.addBtnCircle, { backgroundColor: theme.primary + '20' }]}>
                <Feather name="plus" size={16} color={theme.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Modal visible={showCoAdminPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{t('select_co_admins')}</Text>
                <TouchableOpacity onPress={() => setShowCoAdminPicker(false)} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {selectedCoAdmins.length > 0 && (
                <View style={styles.selectedContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedUsersRow}>
                    {selectedCoAdmins.map((id) => {
                      const u = (project?.coAdmins || []).concat(allConnections).find(x => (x.userId || x.id) == id);
                      return (
                        <TouchableOpacity key={id} onPress={() => handleUserSelection({ id })} style={styles.selectedUserChip}>
                          <Image source={{ uri: u?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={styles.chipAvatar} />
                          <View style={styles.chipCloseWrapper}>
                            <Feather name="x" size={12} color="#fff" />
                          </View>
                          <Text style={[styles.chipName, { color: theme.text }]} numberOfLines={1}>{u?.name || 'User'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={[styles.searchWrapper, { backgroundColor: theme.SearchBar, borderColor: theme.border }]}>
                <Feather name="search" size={18} color={theme.secondaryText} style={{ marginRight: 10 }} />
                <TextInput
                  placeholder={t('search_users_or_connections')}
                  placeholderTextColor={theme.secondaryText}
                  value={searchText}
                  onChangeText={setSearchText}
                  style={[styles.searchInputInModal, { color: theme.text }]}
                />
              </View>

              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                {searchingUsers && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />}
                {mergedUsers.map((item) => {
                  const id = item.userId || item.id;
                  const isSelected = selectedCoAdmins.some(sid => sid == id);
                  return (
                    <TouchableOpacity key={id} onPress={() => handleUserSelection(item)} style={[styles.userListItem, { borderColor: theme.border }]}>
                      <Image source={{ uri: item.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={styles.listItemAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>{item.name || 'User'}</Text>
                        <Text style={{ fontSize: 12, color: item.connectionStatus === 'accepted' ? theme.primary : '#FFA500', marginTop: 2 }}>
                          {item.connectionStatus === 'accepted' ? 'Connected' : 'External User'}
                        </Text>
                      </View>
                      <View style={[styles.checkCircle, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        {isSelected && <Feather name="check" size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <GradientButton title={t('done')} onPress={() => setShowCoAdminPicker(false)} theme={theme} />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {!isKeyboardVisible && (
        <View style={styles.fixedButtonContainer}>
          {updateProjectMutation.isPending ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <GradientButton title={t('save_changes')} onPress={handleUpdate} theme={theme} />
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { paddingTop: Platform.OS === 'ios' ? 60 : 25, marginLeft: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  backText: { fontSize: 17, fontWeight: '600' },
  headerCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, marginBottom: 20, minHeight: 120, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  projectName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  dueDate: { color: '#fff', fontSize: 14, opacity: 0.9, fontWeight: '500' },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 16, gap: 12 },
  fieldBox: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 18, paddingVertical: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  inputLabel: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase', opacity: 0.5, marginBottom: 6, letterSpacing: 0.5 },
  inputValue: { fontSize: 16, fontWeight: '600', paddingVertical: 6 },
  fixedButtonContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, elevation: 10 },
  categoryInputContainer: { position: 'relative', width: '100%' },
  suggestionsContainer: { position: 'absolute', top: 45, left: -18, right: -18, maxHeight: 220, borderWidth: 1, borderRadius: 16, zIndex: 1000, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10 },
  suggestionItem: { padding: 15, borderBottomWidth: 0.5 },
  suggestionText: { fontSize: 16, fontWeight: '700' },
  suggestionSubtext: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  coAdminPreview: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 4 },
  adminChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingRight: 12, paddingLeft: 4, paddingVertical: 4 },
  adminChipAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#fff' },
  adminChipName: { fontSize: 13, fontWeight: '700' },
  addBtnCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#366CD9' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, height: '88%', elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  closeBtn: { padding: 4 },
  selectedContainer: { marginBottom: 20 },
  selectedUsersRow: { maxHeight: 90 },
  selectedUserChip: { width: 70, alignItems: 'center', marginRight: 15 },
  chipAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#366CD9' },
  chipCloseWrapper: { position: 'absolute', top: 0, right: 0, backgroundColor: '#366CD9', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  chipName: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, height: 56 },
  searchInputInModal: { flex: 1, fontSize: 16, fontWeight: '500' },
  userListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5 },
  listItemAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 16 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  modalFooter: { marginTop: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 0 }
});
