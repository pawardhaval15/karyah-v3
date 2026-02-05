import { useCallback, useMemo } from 'react';
import { useConnectionStore } from '../store/connectionStore';

export const useConnectionsSearch = (connections) => {
    const { searchQuery, setSearchQuery } = useConnectionStore();

    const filteredConnections = useMemo(() => {
        const connArray = Array.isArray(connections) ? connections : [];
        if (!searchQuery.trim()) return connArray;

        const lowerQuery = searchQuery.toLowerCase().trim();
        return connArray.filter((conn) => {
            const name = conn.name?.toLowerCase() || '';
            const email = conn.email?.toLowerCase() || '';
            const phone = conn.phone?.toString() || '';

            return name.includes(lowerQuery) ||
                email.includes(lowerQuery) ||
                phone.includes(lowerQuery);
        });
    }, [connections, searchQuery]);

    const maskPhoneNumber = useCallback((phone) => {
        if (!phone) return '';
        const phoneStr = phone.toString();
        if (phoneStr.length <= 4) return phoneStr;

        // Better masking: Keep first 2 and last 2, mask middle
        const start = phoneStr.slice(0, 2);
        const end = phoneStr.slice(-2);
        const masked = '*'.repeat(phoneStr.length - 4);
        return `${start}${masked}${end}`;
    }, []);

    return {
        searchQuery,
        setSearchQuery,
        filteredConnections,
        maskPhoneNumber
    };
};
