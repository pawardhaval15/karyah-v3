import { useCallback, useEffect, useState } from 'react';
import { getConnectionSuggestions, searchUsers, sendConnectionRequest } from '../utils/connections';

export const useDiscoverySearch = () => {
    const [search, setSearch] = useState('');
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null);

    const mapUserData = useCallback((users) => {
        return users.map(user => ({
            id: String(user.id || user.userId || user._id),
            userId: user.userId || user.id || user._id,
            name: user.name || 'Unknown User',
            phone: user.phone || null,
            email: user.email || null,
            avatar: user.profilePhoto && user.profilePhoto.trim() !== ''
                ? user.profilePhoto
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random`,
            added: user.connectionStatus === 'pending' || user.connectionStatus === 'accepted',
            connectionStatus: user.connectionStatus,
        }));
    }, []);

    const fetchSuggestions = useCallback(async () => {
        try {
            setLoading(true);
            const suggestions = await getConnectionSuggestions();
            setPeople(mapUserData(suggestions));
        } catch (error) {
            console.error('Suggestion error:', error.message);
        } finally {
            setLoading(false);
        }
    }, [mapUserData]);

    const handleSearch = useCallback(async (text) => {
        setSearch(text);
        if (text.length < 2) {
            fetchSuggestions();
            return;
        }
        try {
            setLoading(true);
            const results = await searchUsers(text);
            setPeople(mapUserData(results));
        } catch (error) {
            console.error('Search error:', error.message);
        } finally {
            setLoading(false);
        }
    }, [fetchSuggestions, mapUserData]);

    const handleAdd = useCallback(async (userId) => {
        setSendingId(userId);
        try {
            await sendConnectionRequest(userId);
            setPeople(prev =>
                prev.map(p =>
                    p.userId === userId ? { ...p, added: true, connectionStatus: 'pending' } : p
                )
            );
        } catch (error) {
            throw error;
        } finally {
            setSendingId(null);
        }
    }, []);

    const handleRemove = useCallback((id) => {
        setPeople(prev => prev.filter(p => p.id !== id));
    }, []);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    return {
        search,
        setSearch: handleSearch,
        people,
        loading,
        sendingId,
        handleAdd,
        handleRemove,
        refreshSuggestions: fetchSuggestions
    };
};
