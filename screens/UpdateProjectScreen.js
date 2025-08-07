import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useCallback } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import GradientButton from '../components/Login/GradientButton';
import DateBox from '../components/task details/DateBox';
import { useTheme } from '../theme/ThemeContext';
import { getUserConnections, searchConnections } from '../utils/connections';
import { getProjectById, updateProject } from '../utils/project';
import { Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function UpdateProjectScreen({ route, navigation }) {
    const { projectId } = route.params;
    const theme = useTheme();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allConnections, setAllConnections] = useState([]);
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
    const [filteredConnections, setFilteredConnections] = useState([]);
    const [showCoAdminPicker, setShowCoAdminPicker] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
                setKeyboardVisible(true);
            });
            const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
                setKeyboardVisible(false);
            });

            return () => {
                showSubscription.remove();
                hideSubscription.remove();
            };
        }, [])
    );

    useEffect(() => {
        if (showCoAdminPicker) {
            getUserConnections()
                .then(setAllConnections)
                .catch(() => setAllConnections([]));
        }
    }, [showCoAdminPicker]);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await getProjectById(projectId);
                setProject(res);
                setValues({
                    projectName: res.projectName,
                    projectDesc: res.description,
                    projectCategory: res.projectCategory,
                    location: res.location,
                    startDate: res.startDate,
                    endDate: res.endDate,
                });
                setSelectedCoAdmins(res.coAdmins?.map((u) => u.userId) || []);
            } catch (err) {
                Alert.alert('Error', 'Failed to load project.');
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, []);

    const handleChange = (field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }));
    };

    const handleUpdate = async () => {
        try {
            await updateProject(projectId, {
                ...values,
                description: values.projectDesc,
                coAdminIds: selectedCoAdmins,
            });
            Alert.alert('Success', 'Project updated successfully.');
            // Instead of goBack, replace to ProjectDetailsScreen to force refresh
            navigation.replace('ProjectDetailsScreen', { projectId, refresh: true });
        } catch (err) {
            Alert.alert('Error', 'Failed to update project.');
        }
    };

    const handleSearch = async (text) => {
        setSearchText(text);
        if (text.trim()) {
            try {
                const result = await searchConnections(text.trim());
                setFilteredConnections(result);
            } catch (err) {
                setFilteredConnections([]);
            }
        } else {
            setFilteredConnections([]);
        }
    };

    if (loading || !project) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <Text style={{ color: theme.text }}>Loading...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
                    <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
                </TouchableOpacity>
                {/* Header Card */}
                <LinearGradient colors={[theme.secondary, theme.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerCard}>
                    <View>
                        <Text style={styles.projectName}>{project.projectName}</Text>
                        <Text style={styles.dueDate}>Due Date : {values.endDate?.split('T')[0] || '-'}</Text>
                    </View>
                </LinearGradient>
                {/* Date Row */}
                <View style={styles.dateRow}>
                    <DateBox
                        label="Start Date"
                        value={values.startDate}
                        onChange={date => handleChange('startDate', date.toISOString())}
                        theme={theme}
                    />
                    <DateBox
                        label="End Date"
                        value={values.endDate}
                        onChange={date => handleChange('endDate', date.toISOString())}
                        theme={theme}
                    />
                </View>
                {/* Editable Fields */}
                <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Project Name</Text>
                    <TextInput
                        value={values.projectName}
                        placeholder="Project Name"
                        placeholderTextColor={theme.secondaryText}
                        onChangeText={text => handleChange('projectName', text)}
                        style={[styles.inputValue, { color: theme.text }]}
                    />
                </View>
                <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
                    <TextInput
                        value={values.projectCategory}
                        placeholder="Category"
                        placeholderTextColor={theme.secondaryText}
                        onChangeText={text => handleChange('projectCategory', text)}
                        style={[styles.inputValue, { color: theme.text }]}
                    />
                </View>
                <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Location</Text>
                    <TextInput
                        value={values.location}
                        placeholder="Location"
                        placeholderTextColor={theme.secondaryText}
                        onChangeText={text => handleChange('location', text)}
                        style={[styles.inputValue, { color: theme.text }]}
                    />
                </View>
                <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
                    <TextInput
                        value={values.projectDesc}
                        placeholder="Description"
                        placeholderTextColor={theme.secondaryText}
                        onChangeText={text => handleChange('projectDesc', text)}
                        multiline
                        scrollEnabled
                        style={[
                            styles.inputValue,
                            {
                                color: theme.text,
                                minHeight: 60,         // minimum height so users can type comfortably
                                maxHeight: 140,        // maximum height enabling internal scrolling after this
                                textAlignVertical: 'top', // aligns text to top in Android for multiline
                            },
                        ]}
                    />
                </View>
                {/* Co-Admins */}
                <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>Co-Admins</Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowCoAdminPicker(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minHeight: 40, paddingRight: 15 }}>
                        {selectedCoAdmins.length === 0 && (
                            <Text style={{ color: theme.secondaryText }}>Select Co-Admins</Text>
                        )}
                        {selectedCoAdmins.map((id, idx) => {
                            const user = (project.coAdmins || []).find(u => u.userId === id) ||
                                filteredConnections.find(u => u.userId === id);
                            const photo = user?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
                            return (
                                <Image
                                    key={id}
                                    source={{ uri: photo }}
                                    style={{ width: 40, height: 40, borderRadius: 20, marginRight: -10, borderWidth: 2, borderColor: theme.primary, backgroundColor: '#fff' }}
                                />
                            );
                        })}
                        <Feather name="chevron-right" size={20} color={theme.secondaryText} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>
                <Modal
                    visible={showCoAdminPicker}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowCoAdminPicker(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                            style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}
                        >
                            <View
                                style={{
                                    backgroundColor: theme.card,
                                    borderTopLeftRadius: 24,
                                    borderTopRightRadius: 24,
                                    padding: 20,
                                    minHeight: 350,
                                    maxHeight: '70%',
                                }}
                            >
                                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>Select Co-Admins</Text>
                                {selectedCoAdmins.length > 0 && (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={{ marginBottom: 8, minHeight: 54 }}
                                        contentContainerStyle={{ alignItems: 'center', paddingVertical: 0 }}
                                    >
                                        {selectedCoAdmins.map((userId, idx) => {
                                            const user = allConnections.find(u => u.userId === userId);
                                            if (!user) return null;
                                            return (
                                                <TouchableOpacity
                                                    key={userId}
                                                    onPress={() => setSelectedCoAdmins(prev => prev.filter(id => id !== userId))}
                                                    style={{
                                                        alignItems: 'center',
                                                        marginLeft: idx === 0 ? 0 : 6, // overlap avatars
                                                        position: 'relative',
                                                    }}
                                                >
                                                    <Image
                                                        source={{ uri: user.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 20,
                                                            borderWidth: 2,
                                                            borderColor: theme.primary,
                                                        }}
                                                    />
                                                    <Feather name="x-circle" size={16} color={theme.primary} style={{ position: 'absolute', top: -6, right: -6 }} />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                                <TextInput
                                    placeholder="Search Connections"
                                    placeholderTextColor={theme.secondaryText}
                                    value={searchText}
                                    onChangeText={handleSearch}
                                    style={{
                                        color: theme.text,
                                        backgroundColor: theme.SearchBar,
                                        borderRadius: 14,
                                        paddingHorizontal: 12,
                                        paddingVertical: 16,
                                        marginBottom: 10,
                                        borderColor: theme.border,
                                        borderWidth: 1,
                                    }}
                                />
                                <ScrollView keyboardShouldPersistTaps="handled">
                                    {(searchText.trim() ? filteredConnections : allConnections).slice(0, 10).map((item) => (
                                        <TouchableOpacity
                                            key={item.userId}
                                            onPress={() => {
                                                if (!selectedCoAdmins.includes(item.userId)) {
                                                    setSelectedCoAdmins([...selectedCoAdmins, item.userId]);
                                                } else {
                                                    setSelectedCoAdmins(selectedCoAdmins.filter(id => id !== item.userId));
                                                }
                                                setSearchText('');
                                                setFilteredConnections([]);
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
                                    ))}
                                </ScrollView>
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
                        </KeyboardAvoidingView>
                    </View>
                </Modal>
            </ScrollView>
            {!isKeyboardVisible && (
                <View style={styles.fixedButtonContainer}>
                    <GradientButton title="Save Changes" onPress={handleUpdate} theme={theme} />
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    backBtn: {
        paddingTop: Platform.OS === 'ios' ? 70 : 25,
        marginLeft: 16,
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    backText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '400',
        marginLeft: 0,
    },
    headerCard: {
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 110,
    },
    projectName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 6,
    },
    dueDate: {
        color: '#fff',
        fontSize: 13,
        opacity: 0.85,
        fontWeight: '400',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 22,
        marginBottom: 12,
        gap: 8,
    },
    fieldBox: {
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        marginHorizontal: 20,
        marginBottom: 12,
        paddingHorizontal: 14,
        minHeight: 54,
        paddingVertical: 8,
    },
    inputLabel: {
        color: '#222',
        fontWeight: '400',
        fontSize: 14,
        marginBottom: 2,
    },
    inputValue: {
        color: '#444',
        fontSize: 15,
        fontWeight: '400',
        paddingVertical: 4,
        paddingHorizontal: 0,
    },
    fixedButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        zIndex: 10,
        elevation: 5,
    },
});