import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ConnectionDetailsModal from './ConnectionDetailsModal';
import { useTheme } from '../theme/ThemeContext';
import { getUserConnections } from '../utils/connections';
import { Platform } from 'react-native';

export default function ConnectionsScreen({ navigation }) {
    const theme = useTheme();

    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const data = await getUserConnections();
                setConnections(data);
            } catch (error) {
                console.error('Failed to fetch connections:', error.message);
            }
        };
        fetchConnections();
    }, []);

    const filteredConnections = connections.filter(conn =>
        conn.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
                <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>

            <LinearGradient
                colors={['#011F53', '#366CD9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.banner}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Connections</Text>
                    <Text style={styles.bannerDesc}>All your professional connections in one place.</Text>
                </View>
                <TouchableOpacity
                    style={styles.bannerAction}
                    onPress={() => navigation.navigate('AddConnectionScreen')}
                >
                    <Text style={styles.bannerActionText}>Add</Text>
                    <Feather name="user-plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </LinearGradient>

            <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search Connection"
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={filteredConnections}
                keyExtractor={item => item.connectionId.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.connectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setSelectedConnection(item)}
                        activeOpacity={0.8}
                    >
                        <Image
                            source={{ uri: item.profilePhoto || 'https://via.placeholder.com/48' }}
                            style={[styles.avatar, { borderColor: theme.border }]}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                            <Text style={{ color: theme.secondaryText, fontSize: 13, marginTop: 2 }}>
                                {item.phone ? `Phone: ${item.phone}` : ''}
                            </Text>
                        </View>
                        {/* <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.secCard }]}
                            onPress={() => alert('Message')}
                        >
                            <Feather name="message-circle" size={20} color={theme.primary} />
                        </TouchableOpacity> */}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>
                        No connections found.
                    </Text>
                }
            />

            {selectedConnection && (
                <ConnectionDetailsModal
                    connection={selectedConnection}
                    onClose={() => setSelectedConnection(null)}
                    onRemove={(removedId) => {
                        setConnections(prev => prev.filter(c => c.connectionId !== removedId));
                        setSelectedConnection(null);
                    }}
                    theme={theme}
                />
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    backBtn: {
        marginTop: Platform.OS === 'ios' ? 70 : 25,
        marginLeft: 16,
        marginBottom: 28,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
    },
    backText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '400',
        marginLeft: 0,
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
        maxWidth: "80%"
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
        backgroundColor: '#f7f7f7',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#363942',
        paddingVertical: 0,
        fontWeight: '400',
        opacity: 0.7,
    },
    searchIcon: {
        marginRight: 8,
    },
    connectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#e6eaf3',
    },
    name: {
        fontWeight: '400',
        fontSize: 16,
        color: '#222',
    },
    role: {
        color: '#888',
        fontSize: 13,
        marginTop: 2,
        fontWeight: '400',
    },
    actionBtn: {
        backgroundColor: '#E0F2FE',
        borderRadius: 8,
        padding: 8,
        marginLeft: 12,
    },
});