import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Components
import ConnectionCard from '../components/Connections/ConnectionCard';
import ConnectionSearchInput from '../components/Connections/ConnectionSearchInput';
import ConnectionsBanner from '../components/Connections/ConnectionsBanner';
import ConnectionDetailsModal from './ConnectionDetailsModal';

// Hooks
import { useUserConnections } from '../hooks/useConnections';
import { useConnectionsSearch } from '../hooks/useConnectionsSearch';
import { useConnectionStore } from '../store/connectionStore';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

/**
 * ConnectionsScreen - Professional networking management.
 * High-performance list with centralized search and optimized tablet layout.
 */
export default function ConnectionsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Zustand Store
  const {
    revealedNumbers,
    toggleNumberVisibility,
    selectedConnectionId,
    setSelectedConnectionId,
    clearSelectedConnection,
  } = useConnectionStore();

  // Data Fetching
  const { data: connections = [], isLoading, refetch, isFetching } = useUserConnections();

  // Search Logic
  const {
    searchQuery,
    setSearchQuery,
    filteredConnections,
    maskPhoneNumber
  } = useConnectionsSearch(connections);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const selectedConnectionData = useMemo(() => {
    return connections.find(c => c.connectionId === selectedConnectionId);
  }, [connections, selectedConnectionId]);

  const renderItem = useCallback(({ item, index }) => {
    const isRevealed = revealedNumbers.has(item.connectionId);
    const formattedPhone = isRevealed ? item.phone : maskPhoneNumber(item.phone);

    return (
      <ConnectionCard
        item={item}
        theme={theme}
        isTablet={IS_TABLET}
        onSelect={(conn) => setSelectedConnectionId(conn.connectionId)}
        isRevealed={isRevealed}
        onToggleVisibility={toggleNumberVisibility}
        formattedPhone={formattedPhone}
        t={t}
      />
    );
  }, [theme, revealedNumbers, toggleNumberVisibility, maskPhoneNumber, t, setSelectedConnectionId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>
      </View>

      <ConnectionsBanner
        title={t('connections')}
        subtitle={t('all_your_professional_connections')}
        actionLabel={t('add')}
        onAction={() => navigation.navigate('AddConnectionScreen')}
        theme={theme}
        isTablet={IS_TABLET}
      />

      <ConnectionSearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('search_connection')}
        theme={theme}
        isTablet={IS_TABLET}
      />

      {isLoading && !isFetching ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredConnections}
          keyExtractor={(item) => (item.connectionId || item._id || item.id).toString()}
          numColumns={IS_TABLET ? 3 : 1}
          key={IS_TABLET ? 'tablet_list' : 'mobile_list'}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: IS_TABLET ? 24 : 16 }
          ]}
          columnWrapperStyle={IS_TABLET ? styles.columnWrapper : null}
          renderItem={renderItem}

          // Performance Optimization
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}

          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color={theme.secondaryText} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {searchQuery ? t('no_connections_found') : t('start_connecting_today')}
              </Text>
            </View>
          }
        />
      )}

      {selectedConnectionData && (
        <ConnectionDetailsModal
          connection={selectedConnectionData}
          onClose={clearSelectedConnection}
          theme={theme}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
