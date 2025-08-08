import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Modal,
    Alert,
    RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import {
    createWorklist,
    getWorklistsByProjectId,
    updateWorklist,
    deleteWorklist,
} from '../utils/worklist'; // make sure updateWorklist and deleteWorklist are exported
import { Platform } from 'react-native';

// WorklistCard component with Edit and Delete buttons
function WorklistCard({ worklist, navigation, theme, project, onDelete, onEdit }) {
    return (
        <TouchableOpacity
            style={[styles.worklistCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('TaskListScreen', { worklist, project })}
        >
            <View style={[styles.worklistIcon, { backgroundColor: theme.avatarBg }]}>
                <Text style={[styles.worklistIconText, { color: theme.primary }]}>
                    {worklist.name[0]?.toUpperCase() || '?'}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.worklistName, { color: theme.text }]}>{worklist.name}</Text>
            </View>
            {/* Edit button */}
            <TouchableOpacity
                onPress={() => onEdit(worklist)}
                style={{ padding: 8, marginRight: 12 }}
            >
                <MaterialIcons name="edit" size={22} color={theme.primary} />
            </TouchableOpacity>
            {/* Delete button */}
            <TouchableOpacity
                onPress={() => onDelete(worklist.id)}
                style={{ padding: 8 }}
            >
                <MaterialIcons name="delete-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}


export default function WorklistScreen({ navigation, route }) {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [worklists, setWorklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Add states for modals and editing
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newWorklistName, setNewWorklistName] = useState('');

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedWorklist, setSelectedWorklist] = useState(null);
    const [editedWorklistName, setEditedWorklistName] = useState('');

    const project = route.params?.project;
    const projectId = project?.id;
    const projectName = project?.projectName || 'Project Name';
    const fetchWorklists = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const data = await getWorklistsByProjectId(projectId, token);
            setWorklists(data);
        } catch (error) {
            console.error('Failed to fetch worklists:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);  // Important to hide refresh spinner after fetch
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchWorklists();
        }
    }, [projectId]);

    // Handler for Pull-to-Refresh
    const onRefresh = () => {
        setRefreshing(true);
        fetchWorklists();
    };
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const data = await getWorklistsByProjectId(projectId, token);
                setWorklists(data);
            } catch (error) {
                console.error('Failed to fetch worklists:', error.message);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchData();
        }
    }, [projectId]);

    const filtered = worklists
        .filter(w => w.name?.toLowerCase().includes(search.toLowerCase()))
        .sort((b, a) => new Date(b.createdAt) - new Date(a.createdAt));


    // Create new Worklist handlers
    const handleAddWorklist = () => {
        setIsModalVisible(true);
    };
    const handleCreateWorklist = async () => {
        if (!newWorklistName.trim()) {
            Alert.alert('Validation', 'Please enter a worklist name.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            const created = await createWorklist(projectId, newWorklistName.trim(), token);
            setWorklists(prev => [...prev, created]);
            setIsModalVisible(false);
            setNewWorklistName('');
        } catch (error) {
            console.error('Failed to create worklist:', error.message);
            Alert.alert('Error', error.message);
        }
    };
    function WorklistBanner({ projectName, onAdd, theme }) {
        return (
            <LinearGradient
                colors={['#011F53', '#366CD9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.banner}
            >
                <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} ellipsizeMode="tail" style={styles.bannerTitle}>{projectName}</Text>
                    <Text style={styles.bannerDesc}>The list of worklists for this project</Text>
                </View>
                <TouchableOpacity style={styles.bannerAction} onPress={onAdd}>
                    <Text style={styles.bannerActionText}>Worklist</Text>
                    <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </LinearGradient>
        );
    }

    // Delete worklist handler with confirmation
    const handleDeleteWorklist = (id) => {
        Alert.alert(
            'Delete Worklist',
            'Deleting this worklist will also delete all its associated tasks. Do you still want to proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('token');
                            await deleteWorklist(id, token);
                            setWorklists(prev => prev.filter(w => w.id !== id));
                        } catch (error) {
                            console.error('Failed to delete worklist:', error.message);
                            Alert.alert('Error', 'Failed to delete worklist.');
                        }
                    }
                }
            ]
        );
    };

    // Edit worklist modal open
    const openEditModal = (worklist) => {
        setSelectedWorklist(worklist);
        setEditedWorklistName(worklist.name);
        setEditModalVisible(true);
    };

    // Handle worklist update
    const handleUpdateWorklist = async () => {
        if (!editedWorklistName.trim()) {
            Alert.alert('Validation', 'Please enter a worklist name.');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            const updated = await updateWorklist(selectedWorklist.id, editedWorklistName.trim(), token);
            setWorklists(prev =>
                prev.map(w => (w.id === updated.id ? updated : w))
            );
            setEditModalVisible(false);
            setSelectedWorklist(null);
            setEditedWorklistName('');
        } catch (error) {
            console.error('Failed to update worklist:', error.message);
            Alert.alert('Error', error.message || 'Failed to update worklist.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.text, marginTop: 10 }}>Loading worklists...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
                <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>

            <WorklistBanner projectName={projectName} onAdd={handleAddWorklist} theme={theme} />

            {/* Create Worklist Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000088' }}>
                    <View style={{ width: '85%', backgroundColor: theme.card, padding: 20, borderRadius: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
                            Create New Worklist
                        </Text>

                        <TextInput
                            placeholder="Worklist Name"
                            placeholderTextColor={theme.secondaryText}
                            value={newWorklistName}
                            onChangeText={setNewWorklistName}
                            style={{
                                borderWidth: 1,
                                borderColor: theme.border,
                                borderRadius: 10,
                                padding: 12,
                                fontSize: 16,
                                marginBottom: 16,
                                color: theme.text,
                            }}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleCreateWorklist}>
                                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Worklist Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000088' }}>
                    <View style={{ width: '85%', backgroundColor: theme.card, padding: 20, borderRadius: 12 }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
                            Edit Worklist
                        </Text>

                        <TextInput
                            placeholder="Worklist Name"
                            placeholderTextColor={theme.secondaryText}
                            value={editedWorklistName}
                            onChangeText={setEditedWorklistName}
                            style={{
                                borderWidth: 1,
                                borderColor: theme.border,
                                borderRadius: 10,
                                padding: 12,
                                fontSize: 16,
                                marginBottom: 16,
                                color: theme.text,
                            }}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleUpdateWorklist}>
                                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Search bar */}
            <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
                <MaterialIcons name="search" size={22} color={theme.text} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search Worklist"
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Worklist list */}
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                    <WorklistCard
                        worklist={item}
                        navigation={navigation}
                        theme={theme}
                        project={project}
                        onDelete={handleDeleteWorklist}
                        onEdit={openEditModal}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.primary]}        // Android spinner color
                        tintColor={theme.primary}       // iOS spinner color
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    backBtn: {
        paddingTop: Platform.OS === 'ios' ? 70 : 25,
        marginLeft: 16,
        marginBottom: 28,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    backText: {
        fontSize: 18,
        fontWeight: '400',
    },
    banner: {
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        minHeight: 110,
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 2,
    },
    bannerDesc: {
        color: '#e6eaf3',
        fontSize: 14,
        fontWeight: '400',
        maxWidth: '80%',
    },
    bannerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    bannerActionText: {
        color: '#fff',
        fontWeight: '400',
        fontSize: 15,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
    },
    searchIcon: {
        marginRight: 8,
    },
    worklistCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderWidth: 1,
    },
    worklistIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    worklistIconText: {
        fontWeight: '600',
        fontSize: 20,
    },
    worklistName: {
        fontWeight: '500',
        fontSize: 16,
        marginBottom: 2,
    },
    progressCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    progressText: {
        fontWeight: '600',
        fontSize: 12,
    },
});
