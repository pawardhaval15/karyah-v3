import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useUserConnections } from '../hooks/useConnections';
import { useConnectionStore } from '../store/connectionStore';
import { useTheme } from '../theme/ThemeContext';
import ConnectionDetailsModal from './ConnectionDetailsModal';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

// Memoized Card Component for performance
const ConnectionCard = React.memo(({
  item,
  index,
  theme,
  isTablet,
  onSelect,
  revealed,
  onToggleVisibility,
  maskPhone,
  t
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 30, 600)).duration(400)}
      style={{ width: isTablet ? '32%' : '100%' }}
    >
      <TouchableOpacity
        style={[
          styles.connectionCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            marginBottom: isTablet ? 20 : 12,
            padding: isTablet ? 18 : 14,
            borderRadius: isTablet ? 16 : 14,
          },
        ]}
        onPress={() => onSelect(item)}
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
          ]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.phone && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onToggleVisibility(item.connectionId);
              }}
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
                {t('phone')}:{' '}
                {revealed ? item.phone : maskPhone(item.phone)}
              </Text>
              <MaterialIcons
                name={revealed ? 'visibility-off' : 'visibility'}
                size={isTablet ? 18 : 16}
                color={theme.secondaryText}
                style={{ marginLeft: isTablet ? 8 : 6 }}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function ConnectionsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Zustand Store
  const {
    searchQuery,
    setSearchQuery,
    revealedNumbers,
    toggleNumberVisibility,
    selectedConnectionId,
    setSelectedConnectionId,
    clearSelectedConnection
  } = useConnectionStore();

  // React Query for data fetching
  const { data: connections = [], isLoading, refetch, isFetching } = useUserConnections();

  // Silent update when screen is visited
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const maskPhoneNumber = useCallback((phone) => {
    if (!phone) return '';
    const phoneStr = phone.toString();
    if (phoneStr.length <= 4) return phoneStr;
    const visibleDigits = phoneStr.slice(-2);
    const maskedPart = '*'.repeat(phoneStr.length - 2);
    return maskedPart + visibleDigits;
  }, []);

  const filteredConnections = useMemo(() => {
    const connArray = Array.isArray(connections) ? connections : [];
    if (!searchQuery.trim()) return connArray;
    const lowerQuery = searchQuery.toLowerCase();
    return connArray.filter((conn) =>
      conn.name?.toLowerCase().includes(lowerQuery)
    );
  }, [connections, searchQuery]);

  const selectedConnection = useMemo(() => {
    const connArray = Array.isArray(connections) ? connections : [];
    return connArray.find(c => c.connectionId === selectedConnectionId);
  }, [connections, selectedConnectionId]);

  const renderItem = useCallback(({ item, index }) => (
    <ConnectionCard
      item={item}
      index={index}
      theme={theme}
      isTablet={IS_TABLET}
      onSelect={(conn) => setSelectedConnectionId(conn.connectionId)}
      revealed={revealedNumbers.has(item.connectionId)}
      onToggleVisibility={toggleNumberVisibility}
      maskPhone={maskPhoneNumber}
      t={t}
    />
  ), [theme, revealedNumbers, toggleNumberVisibility, maskPhoneNumber, t, setSelectedConnectionId]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
      </TouchableOpacity>

      <LinearGradient
        colors={[theme.primary, theme.primary + 'CC']} // Using primary and a faded primary for a cohesive look
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.banner,
          {
            marginHorizontal: IS_TABLET ? 24 : 16,
            padding: IS_TABLET ? 24 : 18,
            borderRadius: IS_TABLET ? 20 : 16,
            minHeight: IS_TABLET ? 130 : 110,
          }
        ]}>
        <View style={{ flex: 1 }}>
          <Text style={[
            styles.bannerTitle,
            {
              fontSize: IS_TABLET ? 26 : 22,
              marginBottom: IS_TABLET ? 4 : 2,
            }
          ]}>
            {t('connections')}
            {connections && connections.length > 0 && (
              <Text style={{ fontSize: IS_TABLET ? 18 : 16, opacity: 0.8 }}> ({connections.length})</Text>
            )}
          </Text>
          <Text style={[
            styles.bannerDesc,
            {
              fontSize: IS_TABLET ? 16 : 14,
              maxWidth: IS_TABLET ? '85%' : '80%',
            }
          ]}>
            {t('all_your_professional_connections')}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bannerAction,
            {
              borderRadius: IS_TABLET ? 14 : 12,
              paddingHorizontal: IS_TABLET ? 20 : 16,
              paddingVertical: IS_TABLET ? 12 : 8,
            }
          ]}
          onPress={() => navigation.navigate('AddConnectionScreen')}>
          <Text style={[
            styles.bannerActionText,
            { fontSize: IS_TABLET ? 16 : 15 }
          ]}>
            {t('add')}
          </Text>
          <Feather
            name="user-plus"
            size={IS_TABLET ? 20 : 18}
            color="#fff"
            style={{ marginLeft: IS_TABLET ? 6 : 4 }}
          />
        </TouchableOpacity>
      </LinearGradient>

      <View style={[
        styles.searchBarContainer,
        {
          backgroundColor: theme.SearchBar,
          marginHorizontal: IS_TABLET ? 24 : 20,
          paddingHorizontal: IS_TABLET ? 20 : 16,
          paddingVertical: IS_TABLET ? 16 : 12,
          borderRadius: IS_TABLET ? 14 : 12,
        }
      ]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: theme.text,
              fontSize: IS_TABLET ? 18 : 16,
            }
          ]}
          placeholder={t('search_connection')}
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredConnections}
        keyExtractor={(item) => item.connectionId.toString()}
        numColumns={IS_TABLET ? 3 : 1}
        key={IS_TABLET ? 'tablet' : 'mobile'}
        contentContainerStyle={{
          paddingHorizontal: IS_TABLET ? 24 : 16,
          paddingTop: 16,
          paddingBottom: 100
        }}
        columnWrapperStyle={IS_TABLET ? { justifyContent: 'space-between' } : null}
        renderItem={renderItem}
        // Optimization Props
        windowSize={10}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading && (
            <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>
              {t('no_connections_found')}
            </Text>
          )
        }
      />

      {selectedConnection && (
        <ConnectionDetailsModal
          connection={selectedConnection}
          onClose={clearSelectedConnection}
          theme={theme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    fontWeight: '400',
  },
  banner: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  bannerDesc: {
    color: '#e6eaf3',
    fontWeight: '400',
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerActionText: {
    color: '#fff',
    fontWeight: '400',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontWeight: '400',
    opacity: 0.7,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatar: {
    borderWidth: 1,
  },
  name: {
    fontWeight: '400',
  },
});
