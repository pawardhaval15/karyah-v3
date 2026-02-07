import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { getSearchHistory, saveSearchHistory } from '../utils/searchHistory';
import { getQuickSearchSuggestions, performSmartSearch } from '../utils/smartSearch';

export const useSmartSearch = (onClose, navigation) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const searchInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        setSuggestions(getQuickSearchSuggestions());
        loadSearchHistory();

        const timer = setTimeout(() => searchInputRef.current?.focus(), 150);
        return () => clearTimeout(timer);
    }, []);

    const loadSearchHistory = async () => {
        try {
            const history = await getSearchHistory();
            setSearchHistory(history);
        } catch (error) {
            console.error('Error loading search history:', error);
        }
    };

    const executeSearch = useCallback(async (query) => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        try {
            const result = await performSmartSearch(query);
            setSearchResults(result.results || []);
            setShowResults(true);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => executeSearch(searchQuery), 350);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery, executeSearch]);

    const handleResultPress = useCallback((item) => {
        Keyboard.dismiss();
        setShowResults(false);

        if (item.type !== 'suggestion' && searchQuery.trim().length > 0) {
            saveSearchHistory(searchQuery, item.type);
        }

        onClose?.();

        if (item.navigationTarget && navigation) {
            navigation.navigate(item.navigationTarget, item.navigationParams || {});
        }
    }, [searchQuery, onClose, navigation]);

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
        searchInputRef.current?.focus();
    };

    return {
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
    };
};
