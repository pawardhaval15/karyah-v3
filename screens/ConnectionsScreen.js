import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    Dimensions,
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
import { getUserConnections } from '../utils/connections';
import ConnectionDetailsModal from './ConnectionDetailsModal';
import { useTranslation } from 'react-i18next';
export default function ConnectionsScreen({ navigation }) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;
const { t } = useTranslation();
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [search, setSearch] = useState('');
  const [revealedNumbers, setRevealedNumbers] = useState(new Set());

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

  const filteredConnections = connections.filter((conn) =>
    conn.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleNumberVisibility = (connectionId) => {
    setRevealedNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  };

  const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    const phoneStr = phone.toString();
    if (phoneStr.length <= 4) return phoneStr;
    const visibleDigits = phoneStr.slice(-2);
    const maskedPart = '*'.repeat(phoneStr.length - 2);
    return maskedPart + visibleDigits;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
      </TouchableOpacity>

      <LinearGradient
        colors={['#011F53', '#366CD9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.banner,
          {
            marginHorizontal: isTablet ? 24 : 16,
            padding: isTablet ? 24 : 18,
            borderRadius: isTablet ? 20 : 16,
            minHeight: isTablet ? 130 : 110,
          }
        ]}>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.bannerTitle,
            { 
              fontSize: isTablet ? 26 : 22,
              marginBottom: isTablet ? 4 : 2,
            }
          ]}>
           {t('connections')}
          </Text>
          <Text style={[
            styles.bannerDesc,
            { 
              fontSize: isTablet ? 16 : 14,
              maxWidth: isTablet ? '85%' : '80%',
            }
          ]}>
            {t('all_your_professional_connections')}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bannerAction,
            {
              borderRadius: isTablet ? 14 : 12,
              paddingHorizontal: isTablet ? 20 : 16,
              paddingVertical: isTablet ? 12 : 8,
            }
          ]}
          onPress={() => navigation.navigate('AddConnectionScreen')}>
          <Text style={[
            styles.bannerActionText,
            { fontSize: isTablet ? 16 : 15 }
          ]}>
            {t('add')}
          </Text>
          <Feather 
            name="user-plus" 
            size={isTablet ? 20 : 18} 
            color="#fff" 
            style={{ marginLeft: isTablet ? 6 : 4 }} 
          />
        </TouchableOpacity>
      </LinearGradient>

      <View style={[
        styles.searchBarContainer, 
        { 
          backgroundColor: theme.SearchBar,
          marginHorizontal: isTablet ? 24 : 20,
          paddingHorizontal: isTablet ? 20 : 16,
          paddingVertical: isTablet ? 16 : 12,
          borderRadius: isTablet ? 14 : 12,
        }
      ]}>
        <TextInput
          style={[
            styles.searchInput, 
            { 
              color: theme.text,
              fontSize: isTablet ? 18 : 16,
            }
          ]}
          placeholder={t('search_connection')}
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filteredConnections}
        keyExtractor={(item) => item.connectionId.toString()}
        numColumns={isTablet ? 3 : 1}
        key={isTablet ? 'tablet' : 'mobile'}
        contentContainerStyle={{ padding: isTablet ? 24 : 16 }}
        columnWrapperStyle={isTablet ? { justifyContent: 'space-between' } : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.connectionCard,
              { 
                backgroundColor: theme.card, 
                borderColor: theme.border,
                width: isTablet ? '32%' : '100%',
                marginHorizontal: isTablet ? 0 : 0,
                marginBottom: isTablet ? 20 : 12,
                padding: isTablet ? 18 : 14,
                borderRadius: isTablet ? 16 : 14,
              },
            ]}
            onPress={() => setSelectedConnection(item)}
            activeOpacity={0.8}>
            <Image
              source={{ uri: item.profilePhoto || 'https://via.placeholder.com/48' }}
              style={[
                styles.avatar, 
                { 
                  borderColor: theme.border,
                  width: isTablet ? 56 : 48,
                  height: isTablet ? 56 : 48,
                  borderRadius: isTablet ? 28 : 24,
                  marginRight: isTablet ? 18 : 16,
                }
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.name, 
                { 
                  color: theme.text,
                  fontSize: isTablet ? 18 : 16,
                }
              ]}>
                {item.name}
              </Text>
              {item.phone && (
                <TouchableOpacity
                  onPress={() => toggleNumberVisibility(item.connectionId)}
                  activeOpacity={0.7}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginTop: isTablet ? 4 : 2,
                    paddingVertical: isTablet ? 4 : 2,
                  }}>
                  <Text style={{ 
                    color: theme.secondaryText, 
                    fontSize: isTablet ? 14 : 13,
                  }}>
                    Phone:{' '}
                    {revealedNumbers.has(item.connectionId)
                      ? item.phone
                      : maskPhoneNumber(item.phone)}
                  </Text>
                  <MaterialIcons
                    name={revealedNumbers.has(item.connectionId) ? 'visibility-off' : 'visibility'}
                    size={isTablet ? 18 : 16}
                    color={theme.secondaryText}
                    style={{ marginLeft: isTablet ? 8 : 6 }}
                  />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>
            {t('no_connections_found')}
          </Text>
        }
      />

      {selectedConnection && (
        <ConnectionDetailsModal
          connection={selectedConnection}
          onClose={() => setSelectedConnection(null)}
          onRemove={(removedId) => {
            setConnections((prev) => prev.filter((c) => c.connectionId !== removedId));
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
