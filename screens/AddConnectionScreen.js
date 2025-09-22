import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getConnectionSuggestions, searchUsers, sendConnectionRequest } from '../utils/connections';
export default function AddConnectionScreen({ navigation }) {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null);
const { t } = useTranslation();


    useEffect(() => {
        // Fetch suggestions on mount
        fetchSuggestions();
    }, []);

    const handleAdd = async (userId) => {
        setSendingId(userId);
        try {
            await sendConnectionRequest(userId);
            setPeople(prev =>
                prev.map(p =>
                    p.userId === userId ? { ...p, added: true, connectionStatus: 'pending' } : p
                )
            );
        } catch (error) {
            alert(error.message);
        } finally {
            setSendingId(null);
        }
    };

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const suggestions = await getConnectionSuggestions();
            const mapped = suggestions.map(user => ({
                id: String(user.userId),
                name: user.name,
                phone: user.phone || null,
                email: user.email || null,
                avatar: user.profilePhoto && user.profilePhoto.trim() !== ''
                    ? user.profilePhoto
                    : 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
                added: user.connectionStatus === 'pending' || user.connectionStatus === 'accepted',
                connectionStatus: user.connectionStatus,
                userId: user.userId
            }));
            setPeople(mapped);
        } catch (error) {
            console.error('Suggestion error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (text) => {
        setSearch(text);
        if (text.length < 2) {
            fetchSuggestions(); // Show suggestions if search is cleared
            return;
        }
        try {
            setLoading(true);
            const results = await searchUsers(text);
            const mapped = results.map(user => ({
                id: String(user.userId),
                name: user.name,
                phone: user.phone || null,
                email: user.email || null,
                avatar: user.profilePhoto && user.profilePhoto.trim() !== ''
                    ? user.profilePhoto
                    : 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
                added: user.connectionStatus === 'pending' || user.connectionStatus === 'accepted',
                connectionStatus: user.connectionStatus,
                userId: user.userId
            }));
            setPeople(mapped);
        } catch (error) {
            console.error('Search error:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = (id) => {
        setPeople(prev => prev.filter(p => p.id !== id));
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
                <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>

            <LinearGradient
                colors={[theme.secondary, theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.banner}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>{t('connections')}</Text>
                    <Text style={styles.bannerDesc}>{t('all_your_professional_connections')}</Text>
                </View>
            </LinearGradient>

            <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
                <MaterialIcons name="search" size={22} color={theme.text} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={t('search_connection')}
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 30 }} />
            ) : (
                <FlatList
                    data={people}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    renderItem={({ item }) => (
                        <View style={[styles.personCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Image source={{ uri: item.avatar }} style={styles.avatar} />
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text
                                    style={[styles.personName, { color: theme.text }]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {item.name}
                                </Text>
                            </View>
                            {item.connectionStatus === 'accepted' ? (
                                <Text style={{ color: theme.secondaryText, fontSize: 12, marginRight: 10 }}>{t('connected')}</Text>
                            ) : item.connectionStatus === 'pending' || item.added ? (
                                <Text style={{ color: theme.secondaryText, fontSize: 12, marginRight: 10 }}>{t('requested')}</Text>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => handleAdd(item.userId)}
                                    disabled={sendingId === item.userId}
                                >
                                    <LinearGradient
                                        colors={[theme.secondary, theme.primary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.addBtnGradient}
                                    >
                                        {sendingId === item.userId ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.addBtnText}>{t('add')}</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => handleRemove(item.id)}>
                                <Feather name="x" size={22} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>No people found.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
        paddingVertical: 0,
        fontWeight: '400',
        opacity: 0.7,
    },
    searchIcon: {
        marginRight: 8,
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
    container: { flex: 1, paddingHorizontal: 0 },
    backBtn: {
        marginTop: Platform.OS === 'ios' ? 70 : 25,
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
    headerCard: {
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 18,
        padding: 22,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '400',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F3F7',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 18,
        paddingHorizontal: 14,
        height: 48,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 14,
        backgroundColor: '#F8F9FB',
    },
    personName: {
        flex: 1,
        fontWeight: '400',
        fontSize: 16,
        maxWidth: "80%",
    },
    addBtn: {
        marginRight: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    addBtnGradient: {
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 10,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '400',
        fontSize: 12,
        letterSpacing: 0.5,
    },
});