import { Feather, Ionicons } from '@expo/vector-icons';
import FieldBox from 'components/task details/FieldBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSearchUsers, useSendConnectionRequest, useUserConnections } from '../../hooks/useConnections';
import { useUserOrganizations } from '../../hooks/useOrganizations';
import { useCreateProject } from '../../hooks/useProjects';
import { useTheme } from '../../theme/ThemeContext';
import categoriesData from '../../utils/categories.json';
import DateBox from '../task details/DateBox';
export default function ProjectDrawerForm({ values, onChange, onSubmit, hideSimpleForm = false }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Hooks
  const { data: organizations = [] } = useUserOrganizations();
  const { data: connections = [] } = useUserConnections();
  const createProjectMutation = useCreateProject();
  const sendRequestMutation = useSendConnectionRequest();

  // Local State
  const [showFullForm, setShowFullForm] = useState(hideSimpleForm);
  const [selectedCoAdmins, setSelectedCoAdmins] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showCoAdminPicker, setShowCoAdminPicker] = useState(false);
  const [showOrgPicker, setShowOrgPicker] = useState(false);

  // Category suggestions state
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);

  // Default Organization Selection
  useEffect(() => {
    if (organizations.length > 0 && !values?.organizationId) {
      const preferredOrg = organizations.find(org => org.name === "Kona Kona Interiors");
      if (preferredOrg) {
        onChange('organizationId', preferredOrg.id);
      } else if (organizations.length === 1) {
        onChange('organizationId', organizations[0].id);
      }
    }
  }, [organizations, values?.organizationId, onChange]);

  // Search Users logic using hook
  const { data: allUsers = [], isLoading: searchingUsers } = useSearchUsers(searchText);

  // Filter categories and subcategories based on search text
  const filterCategories = (searchText) => {
    if (!searchText || searchText.trim() === '') {
      // Return main categories when no search text for cleaner initial view
      const allSuggestions = [];
      categoriesData.categories.forEach((category) => {
        allSuggestions.push({
          text: category.name,
          type: 'category'
        });
      });
      return allSuggestions;
    }
    const suggestions = [];
    const lowercaseSearch = searchText.toLowerCase();
    categoriesData.categories.forEach((category) => {
      // Check if main category name matches
      if (category.name.toLowerCase().includes(lowercaseSearch)) {
        suggestions.push({
          text: category.name,
          type: 'category'
        });
        // If category matches, add its subcategories too
        category.subcategories.forEach((subcategory) => {
          suggestions.push({
            text: subcategory,
            type: 'subcategory',
            parentCategory: category.name
          });
        });
      } else {
        // Check subcategories only if main category doesn't match
        category.subcategories.forEach((subcategory) => {
          if (subcategory.toLowerCase().includes(lowercaseSearch)) {
            suggestions.push({
              text: subcategory,
              type: 'subcategory',
              parentCategory: category.name
            });
          }
        });
      }
    });
    return suggestions.slice(0, 15); // Increase limit to show more suggestions
  };

  // Handle category input change
  const handleCategoryChange = (text) => {
    onChange('projectCategory', text);
    const suggestions = filterCategories(text);
    setCategorySuggestions(suggestions);
    setShowCategorySuggestions(true); // Always show suggestions when typing
  };

  // Handle category suggestion selection
  const handleCategorySuggestionSelect = (suggestion) => {
    onChange('projectCategory', suggestion.text);
    // If a main category is selected, show its subcategories
    if (suggestion.type === 'category') {
      const category = categoriesData.categories.find(cat => cat.name === suggestion.text);
      if (category && category.subcategories.length > 0) {
        const subcategorySuggestions = category.subcategories.map(sub => ({
          text: sub,
          type: 'subcategory',
          parentCategory: category.name
        }));
        setCategorySuggestions(subcategorySuggestions);
        setShowCategorySuggestions(true);
        return;
      }
    }

    setShowCategorySuggestions(false);
    setCategorySuggestions([]);
  };

  const handleCreate = async () => {
    try {
      if (!values.organizationId) {
        Alert.alert('Validation Error', 'Please select an Organization for this project.');
        return;
      }

      if (!values.projectName || values.projectName.trim() === '') {
        Alert.alert('Validation Error', 'Project name is required.');
        return;
      }

      const payload = {
        ...values,
        description: values.projectDesc,
        coAdminIds: selectedCoAdmins,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : new Date().toISOString(),
        endDate: values.endDate ? new Date(values.endDate).toISOString() : new Date().toISOString(),
      };
      delete payload.projectDesc;

      const createdProject = await createProjectMutation.mutateAsync(payload);
      Alert.alert('Success', `Project "${createdProject.projectName}" created successfully!`);
      setShowFullForm(false);
      if (onSubmit) onSubmit();
    } catch (err) {
      console.error(' Create Project Error:', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create project');
    }
  };

  const mergedUsers = useMemo(() => {
    if (!searchText) return [];
    const searchLower = searchText.toLowerCase();

    // Filter connections
    const filteredConns = connections.filter(conn =>
      conn.name?.toLowerCase().includes(searchLower)
    ).map(conn => ({ ...conn, connectionStatus: 'accepted' }));

    // Merge with allUsers, avoiding duplicates
    const userMap = new Map();
    filteredConns.forEach(conn => userMap.set(conn.userId, conn));
    allUsers.forEach(user => {
      if (!userMap.has(user.userId)) userMap.set(user.userId, user);
    });

    return Array.from(userMap.values());
  }, [connections, allUsers, searchText]);

  const handleUserSelection = async (user) => {
    if (user.connectionStatus === 'accepted') {
      setSelectedCoAdmins(prev =>
        prev.includes(user.userId) ? prev.filter(id => id !== user.userId) : [...prev, user.userId]
      );
    } else if (user.connectionStatus === 'none') {
      try {
        await sendRequestMutation.mutateAsync(user.userId);
        Alert.alert('Request Sent', `Connection request sent to ${user.name}.`);
        if (!selectedCoAdmins.includes(user.userId)) {
          setSelectedCoAdmins(prev => [...prev, user.userId]);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to send connection request.');
      }
    } else if (user.connectionStatus === 'pending') {
      setSelectedCoAdmins(prev =>
        prev.includes(user.userId) ? prev.filter(id => id !== user.userId) : [...prev, user.userId]
      );
    }
  };

  // --- NEW: Helper Component for Organization Input ---
  const OrganizationInputField = ({ style }) => {
    const selectedOrg = organizations.find(o => o.id === values?.organizationId);
    return (
      <TouchableOpacity
        style={[
          styles.inputBox,
          { backgroundColor: theme.card, borderColor: theme.border },
          style
        ]}
        onPress={() => setShowOrgPicker(true)}>
        <Feather
          name="briefcase"
          size={20}
          color={theme.secondaryText}
          style={{ marginRight: 10 }}
        />
        <Text style={{ color: selectedOrg ? theme.text : theme.secondaryText, flex: 1 }}>
          {selectedOrg ? selectedOrg.name : 'Select Organization'}
        </Text>
        <Feather name="chevron-down" size={20} color={theme.secondaryText} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      {!showFullForm && !hideSimpleForm && (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.card }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled">
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <FieldBox
                value={values?.projectName || ''}
                placeholder={t('project_name')}
                theme={theme}
                editable={true}
                onChangeText={(t) => onChange && onChange('projectName', t)}
              />
              <OrganizationInputField />
              <FieldBox
                value={values?.projectDesc || ''}
                placeholder={t('description')}
                theme={theme}
                editable={true}
                multiline={true}
                onChangeText={(t) => onChange && onChange('projectDesc', t)}
              />
              <TouchableOpacity style={styles.drawerBtn} onPress={handleCreate}>
                <LinearGradient
                  colors={['#011F53', '#366CD9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.drawerBtnGradient}>
                  <Text style={styles.drawerBtnText}>{t('create_new_project')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.drawerHint, { color: theme.secondaryText }]}>
                Want to Add Complete Details?{' '}
                <Text
                  style={[styles.drawerHintLink, { color: theme.primary }]}
                  onPress={() => setShowFullForm(true)}>
                  Click Here
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {/* Embedded Full Form (when hideSimpleForm is true) */}
      {hideSimpleForm && (
        <ScrollView
          style={{ backgroundColor: theme.card }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <FieldBox
            value={values?.projectName || ''}
            placeholder={t('project_name')}
            theme={theme}
            editable={true}
            onChangeText={(t) => onChange('projectName', t)}
          />
          <OrganizationInputField />
          <View style={styles.dateRow}>
            <DateBox
              label={t('start_date')}
              value={values?.startDate || ''}
              onChange={(date) => onChange('startDate', date?.toISOString?.() || '')}
              theme={theme}
            />
            <DateBox
              label={t('end_date')}
              value={values?.endDate || ''}
              onChange={(date) => onChange('endDate', date?.toISOString?.() || '')}
              theme={theme}
            />
          </View>
          {/* Custom Category Input with Suggestions */}
          <View style={[styles.categoryInputContainer, { zIndex: 1000 }]}>
            <View style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border }
            ]}>
              <Feather
                name="tag"
                size={20}
                color={theme.secondaryText}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={t('project_category')}
                placeholderTextColor={theme.secondaryText}
                value={values?.projectCategory || ''}
                onChangeText={handleCategoryChange}
                onFocus={() => {
                  const suggestions = filterCategories(values?.projectCategory || '');
                  setCategorySuggestions(suggestions);
                  setShowCategorySuggestions(true);
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow selection
                  // setTimeout(() => setShowCategorySuggestions(false), 200);
                }}
              />
            </View>
            {/* Category Suggestions Dropdown */}
            {showCategorySuggestions && categorySuggestions.length > 0 && (
              <View style={[
                styles.suggestionsContainer,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: '#000'
                }
              ]}>
                <ScrollView
                  style={{ maxHeight: 250 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {categorySuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.text}-${index}`}
                      style={[
                        styles.suggestionItem,
                        {
                          borderBottomColor: theme.border,
                          borderBottomWidth: index === categorySuggestions.length - 1 ? 0 : 0.5
                        }
                      ]}
                      onPress={() => handleCategorySuggestionSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.suggestionText,
                          {
                            color: theme.text,
                            fontWeight: item.type === 'category' ? '600' : '500',
                            marginLeft: item.type === 'subcategory' ? 20 : 0
                          }
                        ]}>
                          {item.text}
                        </Text>
                        {item.type === 'subcategory' && (
                          <Text style={[
                            styles.suggestionSubtext,
                            {
                              color: theme.secondaryText,
                              marginLeft: 20
                            }
                          ]}>
                            in {item.parentCategory}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: theme.secondaryText,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent'
                      }}>
                        {item.type === 'category' ? (
                          <Feather name="folder" size={12} color={theme.secondaryText} />
                        ) : (
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.secondaryText,
                            opacity: 0.6
                          }} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <FieldBox
            value={values?.location || ''}
            placeholder={t('location')}
            theme={theme}
            editable={true}
            onChangeText={(t) => onChange('location', t)}
          />
          <TouchableOpacity
            style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => setShowCoAdminPicker(true)}>
            <Feather
              name="users"
              size={20}
              color={theme.secondaryText}
              style={{ marginRight: 10 }}
            />
            <Text style={{ color: theme.text, flex: 1 }}>
              {selectedCoAdmins.length > 0
                ? `${selectedCoAdmins.length} Co-Admin(s) selected`
                : t('select_co_admins')}
            </Text>
            <Feather name="chevron-right" size={20} color={theme.secondaryText} />
          </TouchableOpacity>
          <FieldBox
            value={values?.projectDesc || ''}
            placeholder={t('description')}
            theme={theme}
            editable={true}
            multiline={true}
            onChangeText={(t) => onChange('projectDesc', t)}
          />
          <TouchableOpacity style={styles.drawerBtn} onPress={handleCreate}>
            <LinearGradient
              colors={['#011F53', '#366CD9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.drawerBtnGradient}>
              <Text style={styles.drawerBtnText}>{t('create_new_project')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}
      {/* Full Modal (only when not embedded) */}
      {!hideSimpleForm && (
        <Modal
          visible={showFullForm}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFullForm(false)}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[styles.fullSheet, { backgroundColor: theme.card }]}>
              <View style={styles.drawerHeader}>
                <Text style={[styles.drawerTitle, { color: theme.text }]}>{t('create_new_project')}</Text>
                <TouchableOpacity
                  onPress={() => setShowFullForm(false)}
                  style={[styles.closeBtn, { backgroundColor: theme.secCard }]}>
                  <Ionicons name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[]} // Empty dummy list
                keyExtractor={() => 'dummy'}
                keyboardShouldPersistTaps="always"
                ListHeaderComponent={
                  <>
                    <FieldBox
                      value={values?.projectName || ''}
                      placeholder={t('project_name')}
                      theme={theme}
                      editable={true}
                      onChangeText={(t) => onChange('projectName', t)}
                    />
                    <View style={{ marginHorizontal: 22, marginBottom: 0 }}>
                      <OrganizationInputField style={{ marginHorizontal: 0 }} />
                    </View>
                    <View style={styles.dateRow}>
                      <DateBox
                        label={t('start_date')}
                        value={values?.startDate || ''}
                        onChange={(date) => onChange('startDate', date?.toISOString?.() || '')}
                        theme={theme}
                      />
                      <DateBox
                        label={t('end_date')}
                        value={values?.endDate || ''}
                        onChange={(date) => onChange('endDate', date?.toISOString?.() || '')}
                        theme={theme}
                      />
                    </View>
                    {/* Custom Category Input with Suggestions */}
                    <View style={[styles.categoryInputContainer, { zIndex: 1000, marginHorizontal: 24, marginBottom: 14 }]}>
                      <View style={[
                        styles.inputBox,
                        { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: 0, marginBottom: 0 }
                      ]}>
                        <Feather
                          name="tag"
                          size={20}
                          color={theme.secondaryText}
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          placeholder={t('project_category')}
                          placeholderTextColor={theme.secondaryText}
                          value={values?.projectCategory || ''}
                          onChangeText={handleCategoryChange}
                          onFocus={() => {
                            const suggestions = filterCategories(values?.projectCategory || '');
                            setCategorySuggestions(suggestions);
                            setShowCategorySuggestions(true);
                          }}
                          onBlur={() => {
                            // Delay hiding suggestions to allow selection
                            setTimeout(() => setShowCategorySuggestions(false), 200);
                          }}
                        />
                      </View>
                      {/* Category Suggestions Dropdown */}
                      {showCategorySuggestions && categorySuggestions.length > 0 && (
                        <View style={[
                          styles.suggestionsContainer,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            shadowColor: '#000'
                          }
                        ]}>
                          <ScrollView
                            style={{ maxHeight: 250 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled={true}
                          >
                            {categorySuggestions.map((item, index) => (
                              <TouchableOpacity
                                key={`${item.text}-${index}`}
                                style={[
                                  styles.suggestionItem,
                                  {
                                    borderBottomColor: theme.border,
                                    borderBottomWidth: index === categorySuggestions.length - 1 ? 0 : 0.5
                                  }
                                ]}
                                onPress={() => handleCategorySuggestionSelect(item)}
                                activeOpacity={0.7}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[
                                    styles.suggestionText,
                                    {
                                      color: theme.text,
                                      fontWeight: item.type === 'category' ? '600' : '500',
                                      marginLeft: item.type === 'subcategory' ? 20 : 0
                                    }
                                  ]}>
                                    {item.text}
                                  </Text>
                                  {item.type === 'subcategory' && (
                                    <Text style={[
                                      styles.suggestionSubtext,
                                      {
                                        color: theme.secondaryText,
                                        marginLeft: 20
                                      }
                                    ]}>
                                      in {item.parentCategory}
                                    </Text>
                                  )}
                                </View>
                                <View style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  borderWidth: 1.5,
                                  borderColor: theme.secondaryText,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'transparent'
                                }}>
                                  {item.type === 'category' ? (
                                    <Feather name="folder" size={12} color={theme.secondaryText} />
                                  ) : (
                                    <View style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 4,
                                      backgroundColor: theme.secondaryText,
                                      opacity: 0.6
                                    }} />
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    <FieldBox
                      value={values?.location || ''}
                      placeholder={t('location')}
                      theme={theme}
                      editable={true}
                      onChangeText={(t) => onChange('location', t)}
                    />

                    <Modal
                      visible={showCoAdminPicker}
                      animationType="slide"
                      transparent
                      onRequestClose={() => setShowCoAdminPicker(false)}>
                      <View
                        style={{
                          flex: 1,
                          justifyContent: 'flex-end',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                        }}>
                        <View
                          style={{
                            backgroundColor: theme.card,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 20,
                            minHeight: 350,
                            maxHeight: '70%',
                          }}>
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: 'bold',
                              fontSize: 16,
                              marginBottom: 8,
                            }}>
                            {t('select_co_admins')}
                          </Text>
                          <Text
                            style={{
                              color: theme.secondaryText,
                              fontSize: 12,
                              marginBottom: 12,
                            }}>
                            Search your connections or add new users. Connection requests will be sent automatically.
                          </Text>
                          <TextInput
                            placeholder="Search connections or add new users..."
                            placeholderTextColor={theme.secondaryText}
                            value={searchText}
                            onChangeText={setSearchText}
                            style={{
                              color: theme.text,
                              backgroundColor: theme.secCard,
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              marginBottom: 10,
                            }}
                          />
                          {/* Unified List - Merge filteredConnections and allUsers */}
                          {mergedUsers.length > 0 && (
                            <FlatList
                              keyboardShouldPersistTaps="always"
                              data={mergedUsers}
                              keyExtractor={(item) => `user-${item.userId}`}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  onPress={() => handleUserSelection(item)}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    borderBottomWidth: 0.5,
                                    borderColor: theme.border,
                                  }}>
                                  <Image
                                    source={{
                                      uri: item.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
                                    }}
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 18,
                                      marginRight: 10,
                                      borderWidth: 1,
                                      borderColor: theme.border,
                                    }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: theme.text, fontWeight: '500' }}>
                                      {item.name}
                                    </Text>
                                    {item.phone && (
                                      <Text style={{ fontSize: 12, color: theme.secondaryText }}>
                                        {t('phone')}: {item.phone}
                                      </Text>
                                    )}
                                    <Text style={{
                                      fontSize: 10,
                                      color: item.connectionStatus === 'accepted'
                                        ? theme.primary
                                        : item.connectionStatus === 'pending'
                                          ? '#FFA500'
                                          : theme.secondaryText
                                    }}>
                                      {item.connectionStatus === 'accepted'
                                        ? 'Connected'
                                        : item.connectionStatus === 'pending'
                                          ? 'Request Pending'
                                          : 'Not Connected'}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: 'center' }}>
                                    {selectedCoAdmins.includes(item.userId) && (
                                      <Feather name="check-circle" size={20} color={theme.primary} />
                                    )}
                                    {item.connectionStatus === 'none' && !selectedCoAdmins.includes(item.userId) && (
                                      <Text style={{
                                        fontSize: 10,
                                        color: theme.secondaryText,
                                        textAlign: 'center'
                                      }}>
                                        Tap to send{'\n'}connection request
                                      </Text>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              )}
                            />
                          )}
                          {/* Show message when no results found */}
                          {searchText.trim() !== '' && mergedUsers.length === 0 && !searchingUsers && (
                            <Text
                              style={{
                                color: theme.secondaryText,
                                textAlign: 'center',
                                marginTop: 20,
                              }}>
                              No users found. Try a different search term.
                            </Text>
                          )}
                          {searchingUsers && (
                            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
                          )}
                          <TouchableOpacity
                            style={{
                              marginTop: 18,
                              alignSelf: 'center',
                              backgroundColor: theme.primary,
                              borderRadius: 12,
                              paddingHorizontal: 32,
                              paddingVertical: 12,
                            }}
                            onPress={() => setShowCoAdminPicker(false)}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                              {t('done')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                    <TouchableOpacity
                      style={[
                        styles.inputBox,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                      onPress={() => setShowCoAdminPicker(true)}>
                      <Feather
                        name="users"
                        size={20}
                        color={theme.secondaryText}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={{ color: theme.text, flex: 1 }}>
                        {selectedCoAdmins.length > 0
                          ? `${selectedCoAdmins.length} Co-Admin(s) selected`
                          : t('select_co_admins')}
                      </Text>
                      <Feather name="chevron-right" size={20} color={theme.secondaryText} />
                    </TouchableOpacity>
                    <FieldBox
                      value={values?.projectDesc || ''}
                      placeholder={t('description')}
                      theme={theme}
                      editable={true}
                      multiline={true}
                      onChangeText={(t) => onChange('projectDesc', t)}
                    />
                    <TouchableOpacity style={styles.drawerBtn} onPress={handleCreate}>
                      <LinearGradient
                        colors={['#011F53', '#366CD9']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.drawerBtnGradient}>
                        <Text style={styles.drawerBtnText}>{t('create_new_project')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                }
              />
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
      {/* --- NEW: Organization Selection Modal --- */}
      <Modal
        visible={showOrgPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrgPicker(false)}>
        <View style={styles.bottomModalContainer}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.card, width: '100%', maxHeight: '50%' }]}>
            <View style={{ paddingHorizontal: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Select Organization</Text>
              <TouchableOpacity onPress={() => setShowOrgPicker(false)}>
                <Ionicons name="close-circle" size={24} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={organizations}
              keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
              contentContainerStyle={{ paddingBottom: 20 }} // Add padding to bottom
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onPress={() => {
                    onChange('organizationId', item.id);
                    setShowOrgPicker(false);
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '500' }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.secondaryText }}>Role: {item.role}</Text>
                  </View>
                  {values?.organizationId === item.id && (
                    <Feather name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.secondaryText, marginBottom: 5 }}>No active organizations found.</Text>
                  <Text style={{ color: theme.secondaryText, fontSize: 10 }}>Check your console logs for details.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
      {/* Co-Admin Picker Modal (Unified List) */}
      <Modal
        visible={showCoAdminPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCoAdminPicker(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.15)',
          }}>
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              minHeight: 350,
              maxHeight: '70%',
            }}>
            <Text
              style={{
                color: theme.text,
                fontWeight: 'bold',
                fontSize: 16,
                marginBottom: 8,
              }}>
              {t('select_co_admins')}
            </Text>
            <Text
              style={{
                color: theme.secondaryText,
                fontSize: 12,
                marginBottom: 12,
              }}>
              Search your connections or add new users. Connection requests will be sent automatically.
            </Text>
            <TextInput
              placeholder="Search connections or add new users..."
              placeholderTextColor={theme.secondaryText}
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
              }}
              style={{
                color: theme.text,
                backgroundColor: theme.secCard,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            />
            {mergedUsers.length > 0 && (
              <FlatList
                keyboardShouldPersistTaps="always"
                data={mergedUsers}
                keyExtractor={(item) => `user-${item.userId}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleUserSelection(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 0.5,
                      borderColor: theme.border,
                    }}>
                    <Image
                      source={{
                        uri: item.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        marginRight: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '500' }}>
                        {item.name}
                      </Text>
                      {item.phone && (
                        <Text style={{ fontSize: 12, color: theme.secondaryText }}>
                          {t('phone')}: {item.phone}
                        </Text>
                      )}
                      <Text style={{
                        fontSize: 10,
                        color: item.connectionStatus === 'accepted'
                          ? theme.primary
                          : item.connectionStatus === 'pending'
                            ? '#FFA500'
                            : theme.secondaryText
                      }}>
                        {item.connectionStatus === 'accepted'
                          ? 'Connected'
                          : item.connectionStatus === 'pending'
                            ? 'Request Pending'
                            : 'Not Connected'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      {selectedCoAdmins.includes(item.userId) && (
                        <Feather name="check-circle" size={20} color={theme.primary} />
                      )}
                      {item.connectionStatus === 'none' && !selectedCoAdmins.includes(item.userId) && (
                        <Text style={{
                          fontSize: 10,
                          color: theme.secondaryText,
                          textAlign: 'center'
                        }}>
                          Tap to send{'\n'}connection request
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            {searchText.trim() !== '' && mergedUsers.length === 0 && (
              <Text
                style={{
                  color: theme.secondaryText,
                  textAlign: 'center',
                  marginTop: 20,
                }}>
                No users found. Try a different search term.
              </Text>
            )}
            <TouchableOpacity
              style={{
                marginTop: 18,
                alignSelf: 'center',
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingHorizontal: 32,
                paddingVertical: 12,
              }}
              onPress={() => setShowCoAdminPicker(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {t('done')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );
}
const styles = StyleSheet.create({
  bottomModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    width: '100%',
  },
  bottomSheet: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    backgroundColor: 'transparent',
  },
  drawerBtn: {
    marginHorizontal: 22,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  drawerBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  drawerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  drawerHint: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 15,
  },
  drawerHintLink: {
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.10)',
    justifyContent: 'flex-end',
  },
  fullSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: 600,
    maxHeight: '95%',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginBottom: 14,
    gap: 10,
  },
  dateBox: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
  },
  dateLabel: {
    fontSize: 13,
    color: '#888',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  inputIcon: {
    marginLeft: 8,
  },
  drawerHeader: {
    paddingTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  drawerTitle: {
    fontSize: 19,
    fontWeight: '500',
  },
  closeBtn: {
    borderRadius: 20,
    padding: 4,
  },
  categoryInputContainer: {
    position: 'relative',
    width: '100%',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 250,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 0,
    marginHorizontal: 16,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    minHeight: 60,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  suggestionSubtext: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.8,
  },
});
