import { Feather, Ionicons } from '@expo/vector-icons';
import FieldBox from 'components/task details/FieldBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import { useTheme } from '../../theme/ThemeContext';
import { searchConnections } from '../../utils/connections';
import { createProject } from '../../utils/project';
import DateBox from '../task details/DateBox';

export default function ProjectDrawerForm({
  values,
  onChange,
  onSubmit,
  hideSimpleForm = false,
}) {
  const [showFullForm, setShowFullForm] = useState(false);
  const [connections, setConnections] = useState([]);
  const [selectedCoAdmins, setSelectedCoAdmins] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [showCoAdminPicker, setShowCoAdminPicker] = useState(false);
  const theme = useTheme();

  const handleCreate = async () => {
    try {
      const payload = {
        ...values,
        description: values.projectDesc,
        location: values.location,
        coAdminIds: selectedCoAdmins,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : '',
        endDate: values.endDate ? new Date(values.endDate).toISOString() : '',
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
      console.error(' Create Project Error:', err);
      Alert.alert('Error', err.message || 'Failed to create project');
    }
  };

  useEffect(() => {
    if (!showFullForm && !hideSimpleForm) return;
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
  }, [showFullForm, hideSimpleForm]);

  useEffect(() => {
    if (!searchText) {
      setFilteredConnections([]);
    } else {
      const filtered = connections.filter(user =>
        user.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredConnections(filtered);
    }
  }, [searchText]);

  // When hideSimpleForm is true, render the full form directly
  if (hideSimpleForm) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="always">
          <FieldBox
            value={values?.projectName || ''}
            placeholder="Project Name"
            theme={theme}
            editable={true}
            onChangeText={t => onChange('projectName', t)}
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
            onChangeText={t => onChange('projectCategory', t)}
          />
          <FieldBox
            value={values?.location || ''}
            placeholder="Project Location"
            theme={theme}
            editable={true}
            onChangeText={t => onChange('location', t)}
          />
          <TouchableOpacity
            style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowCoAdminPicker(true)}
          >
            <Feather name="users" size={20} color={theme.secondaryText} style={{ marginRight: 10 }} />
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
            onChangeText={t => onChange('projectDesc', t)}
          />
          <TouchableOpacity style={styles.drawerBtn} onPress={handleCreate}>
            <LinearGradient
              colors={['#011F53', '#366CD9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.drawerBtnGradient}
            >
              <Text style={styles.drawerBtnText}>Create Project</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Co-Admin Picker Modal */}
          <Modal
            visible={showCoAdminPicker}
            animationType="slide"
            transparent
            onRequestClose={() => setShowCoAdminPicker(false)}
          >
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <View style={{
                backgroundColor: theme.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                minHeight: 350,
                maxHeight: '70%',
              }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>Select Co-Admins</Text>
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
                          setSelectedCoAdmins(prev => prev.filter(id => id !== item.userId));
                        } else {
                          setSelectedCoAdmins(prev => [...prev, item.userId]);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderBottomWidth: 0.5,
                        borderColor: theme.border,
                      }}
                    >
                      <Image
                        source={{ uri: item.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
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
                        <Text style={{ color: theme.text, fontWeight: '500' }}>{item.name}</Text>
                        {item.phone && <Text style={{ fontSize: 12, color: theme.secondaryText }}>Phone: {item.phone}</Text>}
                      </View>
                      {selectedCoAdmins.includes(item.userId) && (
                        <Feather name="check-circle" size={20} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    searchText.trim() !== '' ? (
                      <Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 20 }}>No connections found.</Text>
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
                  onPress={() => setShowCoAdminPicker(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Original simple form logic when hideSimpleForm is false
  return (
    <>
      {!showFullForm && (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.card }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled={true}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <FieldBox
                value={values?.projectName || ''}
                placeholder="Project Name"
                theme={theme}
                editable={true}
                onChangeText={t => onChange && onChange('projectName', t)}
              />
              <FieldBox
                value={values?.projectDesc || ''}
                placeholder="Description"
                theme={theme}
                editable={true}
                multiline={true}
                onChangeText={t => onChange && onChange('projectDesc', t)}
              />
              <TouchableOpacity style={styles.drawerBtn} onPress={handleCreate}>
                <LinearGradient
                  colors={['#011F53', '#366CD9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.drawerBtnGradient}
                >
                  <Text style={styles.drawerBtnText}>Create Project</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={[styles.drawerHint, { color: theme.secondaryText }]}>
                Want to Add Complete Details?{' '}
                <Text style={[styles.drawerHintLink, { color: theme.primary }]} onPress={() => setShowFullForm(true)}>
                  Click Here
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {/* Rest of the modal logic for showFullForm... */}
    </>
  );
}

const styles = StyleSheet.create({
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
  drawerBtn: {
    marginHorizontal: 22,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  drawerBtnGradient: {
    paddingVertical: 14,
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginBottom: 14,
    gap: 10,
  },
});
