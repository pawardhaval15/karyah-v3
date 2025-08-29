import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSearchHistory, saveSearchHistory } from '../../utils/searchHistory';
import { getQuickSearchSuggestions, performSmartSearch } from '../../utils/smartSearch';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SmartSearchBar = ({ navigation, theme, onClose }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    // Show quick suggestions when component mounts
    setSuggestions(getQuickSearchSuggestions());

    // Load search history
    loadSearchHistory();

    // Auto-focus search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await getSearchHistory();
      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const debounceSearch = useCallback((query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsSearching(true);
        try {
          const result = await performSmartSearch(query);
          setSearchResults(result.results || []);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
          // Show user-friendly error if needed
          // Alert.alert('Search Error', 'Unable to perform search. Please try again.');
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    debounceSearch(searchQuery);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debounceSearch]);

  const handleResultPress = (item) => {
    Keyboard.dismiss();
    setShowResults(false);

    // Save to search history if it's a search result
    if (item.type !== 'suggestion' && searchQuery.trim().length > 0) {
      saveSearchHistory(searchQuery, item.type);
    }

    onClose?.();

    // Navigate to the target screen
    if (item.navigationTarget && navigation) {
      navigation.navigate(item.navigationTarget, item.navigationParams || {});
    }
  };

  const handleHistoryItemPress = (historyItem) => {
    setSearchQuery(historyItem.query);
    // Trigger search immediately for the history item
    debounceSearch(historyItem.query);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'project':
        return 'folder';
      case 'task':
      case 'created-task':
        return 'check-square';
      case 'worklist':
        return 'list';
      case 'user':
        return 'user';
      case 'suggestion':
        return 'zap';
      case 'history':
        return 'clock';
      default:
        return 'search';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'project':
        return '#4CAF50';
      case 'task':
        return '#2196F3';
      case 'created-task':
        return '#FF9800';
      case 'worklist':
        return '#9C27B0';
      case 'user':
        return '#E91E63';
      case 'suggestion':
        return theme.primary || '#366CD9';
      case 'history':
        return theme.secondaryText;
      default:
        return theme.secondaryText;
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    searchInputRef.current?.focus();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose?.();
  };

  const renderSearchResult = ({ item }) => {
    if (!item) return null;

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}>
        <View style={styles.resultContent}>
          <View style={styles.iconContainer}>
            {item.type === 'user' && item.icon ? (
              <Image source={{ uri: item.icon }} style={styles.userAvatar} resizeMode="cover" />
            ) : (
              <Feather name={getTypeIcon(item.type)} size={18} color={getTypeColor(item.type)} />
            )}
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title || 'Untitled'}
            </Text>
            {item.subtitle && (
              <Text
                style={[styles.resultSubtitle, { color: theme.secondaryText }]}
                numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
            {item.metadata && (
              <Text
                style={[styles.resultMetadata, { color: theme.secondaryText }]}
                numberOfLines={1}>
                {item.metadata}
              </Text>
            )}
          </View>

          <Feather name="chevron-right" size={16} color={theme.secondaryText} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestion = ({ item }) => {
    if (!item) return null;

    return (
      <TouchableOpacity
        style={[
          styles.suggestionItem,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}>
        <View style={styles.resultContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Feather name={getTypeIcon(item.type)} size={18} color={theme.primary || '#366CD9'} />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.secondaryText }]} numberOfLines={1}>
              {item.subtitle || 'No description'}
            </Text>
          </View>

          <Feather name="chevron-right" size={16} color={theme.secondaryText} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSeparator = ({ item }) => (
    <View style={[styles.separatorContainer, { borderBottomColor: theme.border }]}>
      <Text style={[styles.separatorText, { color: theme.secondaryText }]}>{item.title}</Text>
    </View>
  );

  const renderHistoryItem = ({ item }) => {
    if (!item) return null;

    return (
      <TouchableOpacity
        style={[
          styles.historyItem,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
        onPress={() => handleHistoryItemPress(item)}
        activeOpacity={0.7}>
        <View style={styles.resultContent}>
          <View
            style={[styles.historyIconContainer, { backgroundColor: theme.secondaryText + '15' }]}>
            <Feather name="clock" size={16} color={theme.secondaryText} />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>
              {item.query || item.title || 'Unknown search'}
            </Text>
            <Text
              style={[styles.historySubtitle, { color: theme.secondaryText }]}
              numberOfLines={1}>
              Recent search
            </Text>
          </View>

          <Feather
            name="arrow-up-left"
            size={14}
            color={theme.secondaryText}
            style={{ opacity: 0.6 }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Combine suggestions and history when no search query
  const combinedSuggestions =
    searchQuery.length === 0
      ? [
          ...(suggestions || []).map((item, index) => ({
            ...item,
            id: item.id || `suggestion-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: item.type || 'suggestion',
            title: item.title || item.name || `Suggestion ${index + 1}`,
          })),
          // Add separator if we have both suggestions and history
          ...((suggestions || []).length > 0 && (searchHistory || []).length > 0
            ? [
                {
                  id: 'separator-history-' + Date.now(),
                  type: 'separator',
                  title: 'Recent Searches',
                  isSeparator: true,
                },
              ]
            : []),
          ...(searchHistory || []).slice(0, 5).map((item, index) => ({
            ...item,
            id: item.id || `history-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'history',
            title: item.query || item.title || `Search ${index + 1}`,
            subtitle: 'Recent search',
            metadata: 'Search history',
          })),
        ]
      : [];

  const displayResults = showResults 
    ? (searchResults || []).map((item, index) => ({
        ...item,
        id: item.id || `result-${item.type || 'unknown'}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: item.type || 'unknown',
        title: item.title || item.name || `Result ${index + 1}`,
      }))
    : combinedSuggestions;

  return (
    <Modal visible={true} animationType="fade" transparent={true} onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 10,
            },
          ]}>
          {/* Search Header */}
          <View style={styles.searchHeader}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.backButton, { backgroundColor: theme.card }]}>
              <Feather name="arrow-left" size={20} color={theme.text} />
            </TouchableOpacity>

            <View
              style={[
                styles.searchInputContainer,
                { backgroundColor: theme.SearchBar, borderColor: theme.border },
              ]}>
              <Feather name="search" size={18} color={theme.secondaryText} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search projects, tasks, users..."
                placeholderTextColor={theme.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Feather name="x" size={16} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Loading indicator */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary || '#366CD9'} />
              <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Searching...</Text>
            </View>
          )}

          {/* Results */}
          <FlatList
            data={displayResults}
            renderItem={({ item }) => {
              if (item.isSeparator) {
                return renderSeparator({ item });
              } else if (item.type === 'history') {
                return renderHistoryItem({ item });
              } else if (showResults) {
                return renderSearchResult({ item });
              } else {
                return renderSuggestion({ item });
              }
            }}
            keyExtractor={(item, index) => {
              // Create a more robust unique key
              const itemType = item?.type || 'unknown';
              const itemId = item?.id || '';
              const itemTitle = item?.title || item?.name || 'untitled';
              const timestamp = Date.now();
              const randomId = Math.random().toString(36).substr(2, 9);
              
              // Handle different scenarios to ensure uniqueness
              if (itemId) {
                return `${itemType}-${itemId}-${index}`;
              }
              
              // For items without ID, create a unique key
              const sanitizedTitle = itemTitle.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              return `${itemType}-${index}-${sanitizedTitle}-${timestamp}-${randomId}`;
            }}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              displayResults.length > 0 ? (
                <View style={styles.resultsHeader}>
                  <Text style={[styles.resultsHeaderText, { color: theme.secondaryText }]}>
                    {showResults
                      ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
                      : combinedSuggestions.length > suggestions.length
                        ? 'QUICK ACTIONS & RECENT SEARCHES'
                        : 'QUICK ACTIONS'}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !isSearching && searchQuery.length >= 2 ? (
                <View style={styles.emptyContainer}>
                  <Feather
                    name="search"
                    size={48}
                    color={theme.secondaryText}
                    style={styles.emptyIcon}
                  />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No results found</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                    Try searching for projects, tasks, or users
                  </Text>
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
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
  },
  resultsHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  resultsHeaderText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginVertical: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginVertical: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  historyItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginVertical: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 19,
  },
  resultSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  historySubtitle: {
    fontSize: 13,
    lineHeight: 17,
    opacity: 0.7,
  },
  separatorContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  resultMetadata: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    opacity: 0.3,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SmartSearchBar;
