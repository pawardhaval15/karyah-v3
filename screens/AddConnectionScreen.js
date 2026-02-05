import { MaterialIcons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Components
import ConnectionSearchInput from '../components/Connections/ConnectionSearchInput';
import ConnectionsBanner from '../components/Connections/ConnectionsBanner';
import SuggestionCard from '../components/Connections/SuggestionCard';

// Hooks
import { useDiscoverySearch } from '../hooks/useDiscoverySearch';
import { useTheme } from '../theme/ThemeContext';

/**
 * AddConnectionScreen - Discovery and networking expansion.
 * Features real-time search, intelligent suggestions, and smooth connection flow.
 */
export default function AddConnectionScreen({ navigation }) {
    const theme = useTheme();
    const { t } = useTranslation();

    const {
        search,
        setSearch,
        people,
        loading,
        sendingId,
        handleAdd,
        handleRemove,
    } = useDiscoverySearch();

    const onAddConnection = useCallback(async (userId) => {
        try {
            await handleAdd(userId);
        } catch (error) {
            // Using a simple alert for now, but in production this could be a custom Toast
            alert(error.message || t('failed_to_send_request'));
        }
    }, [handleAdd, t]);

    const renderItem = useCallback(({ item }) => (
        <SuggestionCard
            item={item}
            theme={theme}
            onAdd={onAddConnection}
            onRemove={handleRemove}
            isSending={sendingId === item.userId}
            t={t}
        />
    ), [theme, onAddConnection, handleRemove, sendingId, t]);

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
                title={t('find_people')}
                subtitle={t('expand_professional_network')}
                theme={theme}
                isTablet={false} // Force consistent look for mobile discovery
            />

            <ConnectionSearchInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('name_email_or_phone')}
                theme={theme}
                isTablet={false}
            />

            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
                    {search.length >= 2 ? t('search_results') : t('suggestions')}
                </Text>
            </View>

            {loading && !people.length ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={people}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="search-off" size={64} color={theme.secondaryText} style={{ opacity: 0.5 }} />
                            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                                {t('no_people_found')}
                            </Text>
                        </View>
                    }
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
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
});