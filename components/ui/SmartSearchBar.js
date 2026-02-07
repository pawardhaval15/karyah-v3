import { Feather } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartSearch } from '../../hooks/useSmartSearch';

const SearchItem = memo(({ item, onPress, theme, getTypeIcon, getTypeColor }) => {
  const isHistory = item.type === 'history';
  const isSuggestion = item.type === 'suggestion';
  const isUser = item.type === 'user';

  return (
    <TouchableOpacity
      style={[styles.itemLink, { backgroundColor: theme.card }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContainer}>
        <View style={[
          styles.iconBox,
          { backgroundColor: isHistory ? theme.secondaryText + '10' : getTypeColor(item.type) + '15' }
        ]}>
          {isUser && item.icon ? (
            <Image source={{ uri: item.icon }} style={styles.avatar} />
          ) : (
            <Feather
              name={getTypeIcon(item.type)}
              size={isHistory ? 16 : 18}
              color={isHistory ? theme.secondaryText : getTypeColor(item.type)}
            />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title || item.query || 'Untitled'}
          </Text>
          {(item.subtitle || isHistory) && (
            <Text style={[styles.itemSub, { color: theme.secondaryText }]} numberOfLines={1}>
              {isHistory ? 'Recent Search' : item.subtitle}
            </Text>
          )}
        </View>

        <Feather
          name={isHistory ? "arrow-up-left" : "chevron-right"}
          size={16}
          color={theme.secondaryText}
          style={{ opacity: 0.5 }}
        />
      </View>
    </TouchableOpacity>
  );
});

const SmartSearchBar = ({ navigation, theme, onClose }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showResults,
    suggestions,
    searchHistory,
    searchInputRef,
    handleResultPress,
    clearSearch,
  } = useSmartSearch(onClose, navigation);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'project': return 'folder';
      case 'task':
      case 'created-task': return 'check-square';
      case 'user': return 'user';
      case 'history': return 'clock';
      case 'suggestion': return 'zap';
      default: return 'search';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'project': return '#4CAF50';
      case 'task': return '#2196F3';
      case 'user': return '#E91E63';
      case 'suggestion': return theme.primary;
      default: return theme.secondaryText;
    }
  };

  const displayData = useMemo(() => {
    if (showResults) return searchResults;
    if (searchQuery.length === 0) {
      const items = [...suggestions];
      if (searchHistory.length > 0) {
        items.push({ id: 'sep-hist', type: 'separator', title: 'Recent Searches' });
        items.push(...searchHistory.slice(0, 5).map(h => ({ ...h, type: 'history' })));
      }
      return items;
    }
    return [];
  }, [showResults, searchResults, searchQuery, suggestions, searchHistory]);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top + 10 }
        ]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.card }]}>
              <Feather name="arrow-left" size={22} color={theme.text} />
            </TouchableOpacity>

            <View style={[styles.inputGroup, { backgroundColor: theme.SearchBar, borderColor: theme.border }]}>
              <Feather name="search" size={18} color={theme.secondaryText} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder={t('search_placeholder')}
                placeholderTextColor={theme.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Feather name="x" size={18} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isSearching && (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loaderText, { color: theme.secondaryText }]}>{t('searching')}</Text>
            </View>
          )}

          <FlatList
            data={displayData}
            keyExtractor={(item, index) => `${item.type}-${item.id || 'no-id'}-${index}`}
            renderItem={({ item }) => {
              if (item.type === 'separator') {
                return (
                  <View style={[styles.separator, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.sepText, { color: theme.secondaryText }]}>{item.title}</Text>
                  </View>
                );
              }
              return (
                <SearchItem
                  item={item}
                  onPress={handleResultPress}
                  theme={theme}
                  getTypeIcon={getTypeIcon}
                  getTypeColor={getTypeColor}
                />
              );
            }}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isSearching && searchQuery.length >= 2 ? (
                <View style={styles.empty}>
                  <Feather name="search" size={48} color={theme.secondaryText} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('no_results')}</Text>
                </View>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  loader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loaderText: { fontSize: 14, fontWeight: '500' },
  list: { paddingBottom: 40 },
  itemLink: {
    borderRadius: 14,
    marginVertical: 4,
    padding: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  textContainer: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, opacity: 0.8 },
  separator: {
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  sepText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  empty: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', opacity: 0.6 },
});

export default memo(SmartSearchBar);
