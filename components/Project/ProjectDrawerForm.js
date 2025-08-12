import { Feather, Ionicons } from '@expo/vector-icons';
import FieldBox from 'components/task details/FieldBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { searchConnections } from '../../utils/connections';
import { createProject } from '../../utils/project';
import DateBox from '../task details/DateBox';

export default function ProjectDrawerForm({ values, onChange, onSubmit, hideSimpleForm = false }) {
  const [showFullForm, setShowFullForm] = useState(hideSimpleForm);
  const [connections, setConnections] = useState([]);
  const [selectedCoAdmins, setSelectedCoAdmins] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [showCoAdminPicker, setShowCoAdminPicker] = useState(false);
  const [isStartDateModalVisible, setStartDateModalVisible] = useState(false);
  const [isEndDateModalVisible, setEndDateModalVisible] = useState(false);
  const theme = useTheme();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleCreate = async () => {
    try {
      const payload = {
        ...values,
        description: values.projectDesc,
        location: values.location,
        coAdminIds: selectedCoAdmins,
        startDate:
          values.startDate && !isNaN(new Date(values.startDate))
            ? new Date(values.startDate).toISOString()
            : new Date().toISOString(), // fallback today
        endDate:
          values.endDate && !isNaN(new Date(values.endDate))
            ? new Date(values.endDate).toISOString()
            : new Date().toISOString(), // fallback today
      };
      delete payload.projectDesc;
      if (!payload.projectName || payload.projectName.trim() === '') {
        Alert.alert('Validation Error', 'Project name is required.');
        return;
      }
      const createdProject = await createProject(payload);
      Alert.alert('Success', `Project "${createdProject.projectName}" created successfully!`);
      setShowFullForm(false);
      if (onSubmit) onSubmit();
    } catch (err) {
      console.error('❌ Create Project Error:', err);
      Alert.alert('Error', err.message || 'Failed to create project');
    }
  };

  useEffect(() => {
    if (!showFullForm) return;
    const fetchConnections = async () => {
      try {
        const result = await searchConnections('a');
        setConnections(result);
        setFilteredConnections(result);
      } catch (err) {
        console.error('Error fetching connections:', err);
      }
    };
    fetchConnections();
  }, [showFullForm]);

  useEffect(() => {
    if (!searchText) {
      setFilteredConnections([]);
    } else {
      const filtered = connections.filter((user) =>
        user.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredConnections(filtered);
    }
  }, [searchText]);
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
                placeholder="Project Name"
                theme={theme}
                editable={true}
                onChangeText={(t) => onChange && onChange('projectName', t)}
              />
              <FieldBox
                value={values?.projectDesc || ''}
                placeholder="Description"
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
                  <Text style={styles.drawerBtnText}>Create Project</Text>
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
            placeholder="Project Name"
            theme={theme}
            editable={true}
            onChangeText={(t) => onChange('projectName', t)}
          />
          <View style={styles.dateRow}>
            <DateBox
              label="Start Date"
              value={values?.startDate || ''}
              onChange={(date) => onChange('startDate', date?.toISOString?.() || '')}
              theme={theme}
            />
            <DateBox
              label="End Date"
              value={values?.endDate || ''}
              onChange={(date) => onChange('endDate', date?.toISOString?.() || '')}
              theme={theme}
            />
          </View>
          <FieldBox
            value={values?.projectCategory || ''}
            placeholder="Project Category"
            theme={theme}
            editable={true}
            onChangeText={(t) => onChange('projectCategory', t)}
          />
          <FieldBox
            value={values?.location || ''}
            placeholder="Project Location"
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
                : 'Select Co-Admins'}
            </Text>
            <Feather name="chevron-right" size={20} color={theme.secondaryText} />
          </TouchableOpacity>
          <FieldBox
            value={values?.projectDesc || ''}
            placeholder="Description"
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
              <Text style={styles.drawerBtnText}>Create Project</Text>
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
                <Text style={[styles.drawerTitle, { color: theme.text }]}>Create New Project</Text>
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
                      placeholder="Project Name"
                      theme={theme}
                      editable={true}
                      onChangeText={(t) => onChange('projectName', t)}
                    />
                    <View style={styles.dateRow}>
                      <DateBox
                        label="Start Date"
                        value={values?.startDate || ''}
                        onChange={(date) => onChange('startDate', date?.toISOString?.() || '')}
                        theme={theme}
                      />
                      <DateBox
                        label="End Date"
                        value={values?.endDate || ''}
                        onChange={(date) => onChange('endDate', date?.toISOString?.() || '')}
                        theme={theme}
                      />
                    </View>
                    <FieldBox
                      value={values?.projectCategory || ''}
                      placeholder="Project Category"
                      theme={theme}
                      editable={true}
                      onChangeText={(t) => onChange('projectCategory', t)}
                    />
                    <FieldBox
                      value={values?.location || ''}
                      placeholder="Project Location"
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
                              marginBottom: 12,
                            }}>
                            Select Co-Admins
                          </Text>
                          <TextInput
                            placeholder="Search Connections"
                            placeholderTextColor={theme.secondaryText}
                            value={searchText}
                            onChangeText={async (text) => {
                              setSearchText(text);
                              if (text.trim()) {
                                try {
                                  const result = await searchConnections(text.trim());
                                  setFilteredConnections(result);
                                } catch (err) {
                                  console.error('Search Error:', err);
                                  setFilteredConnections([]);
                                }
                              } else {
                                setFilteredConnections([]);
                              }
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
                          <FlatList
                            keyboardShouldPersistTaps="always"
                            data={filteredConnections.slice(0, 10)}
                            keyExtractor={(item) => item.userId.toString()}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                onPress={() => {
                                  if (selectedCoAdmins.includes(item.userId)) {
                                    setSelectedCoAdmins((prev) =>
                                      prev.filter((id) => id !== item.userId)
                                    );
                                  } else {
                                    setSelectedCoAdmins((prev) => [...prev, item.userId]);
                                  }
                                }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingVertical: 10,
                                  borderBottomWidth: 0.5,
                                  borderColor: theme.border,
                                }}>
                                <Image
                                  source={{
                                    uri:
                                      item.profilePhoto ||
                                      'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
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
                                      Phone: {item.phone}
                                    </Text>
                                  )}
                                </View>
                                {selectedCoAdmins.includes(item.userId) && (
                                  <Feather name="check-circle" size={20} color={theme.primary} />
                                )}
                              </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                              searchText.trim() !== '' ? (
                                <Text
                                  style={{
                                    color: theme.secondaryText,
                                    textAlign: 'center',
                                    marginTop: 20,
                                  }}>
                                  No connections found.
                                </Text>
                              ) : null
                            }
                          />
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
                              Done
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
                          : 'Select Co-Admins'}
                      </Text>
                      <Feather name="chevron-right" size={20} color={theme.secondaryText} />
                    </TouchableOpacity>
                    <FieldBox
                      value={values?.projectDesc || ''}
                      placeholder="Description"
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
                        <Text style={styles.drawerBtnText}>Create Project</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                }
              />
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
      {/* Co-Admin Picker Modal (shared between embedded and full modal) */}
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
                marginBottom: 12,
              }}>
              Select Co-Admins
            </Text>
            <TextInput
              placeholder="Search Connections"
              placeholderTextColor={theme.secondaryText}
              value={searchText}
              onChangeText={async (text) => {
                setSearchText(text);
                if (text.trim()) {
                  try {
                    const result = await searchConnections(text.trim());
                    setFilteredConnections(result);
                  } catch (err) {
                    console.error('Search Error:', err);
                    setFilteredConnections([]);
                  }
                } else {
                  setFilteredConnections([]);
                }
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
            <FlatList
              keyboardShouldPersistTaps="always"
              data={filteredConnections.slice(0, 10)}
              keyExtractor={(item) => item.userId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (selectedCoAdmins.includes(item.userId)) {
                      setSelectedCoAdmins((prev) =>
                        prev.filter((id) => id !== item.userId)
                      );
                    } else {
                      setSelectedCoAdmins((prev) => [...prev, item.userId]);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 0.5,
                    borderColor: theme.border,
                  }}>
                  <Image
                    source={{
                      uri:
                        item.profilePhoto ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
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
                        Phone: {item.phone}
                      </Text>
                    )}
                  </View>
                  {selectedCoAdmins.includes(item.userId) && (
                    <Feather name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchText.trim() !== '' ? (
                  <Text
                    style={{
                      color: theme.secondaryText,
                      textAlign: 'center',
                      marginTop: 20,
                    }}>
                    No connections found.
                  </Text>
                ) : null
              }
            />
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
                Done
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
});
