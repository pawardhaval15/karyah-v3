import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    Dimensions,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet,
    Platform, RefreshControl,
} from 'react-native';
import CreateCommunityModal from '../components/Community/AddCommunity'
import { useTheme } from '../theme/ThemeContext';
import { fetchCommunitiesByOrganization, fetchUserDetails, createCommunity } from '../utils/community';
import { useTranslation } from 'react-i18next';

export default function CommunityScreen({ navigation, route }) {
    const theme = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const isTablet = screenWidth >= 768;
    const { t } = useTranslation();
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [communities, setCommunities] = useState([]);
    const [search, setSearch] = useState('');
    const [organizationId, setOrganizationId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('User');
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState('Member');
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            if (organizationId) {
                const updated = await fetchCommunitiesByOrganization(organizationId);
                setCommunities(updated);
            }
        } catch (_err) {
            // intentionally unused
        }
        setRefreshing(false);
    }, [organizationId]);

    useFocusEffect(
        React.useCallback(() => {
            if (route.params && route.params.refresh) {
                onRefresh();
                navigation.setParams({ refresh: false });
            }
        }, [navigation, onRefresh, route.params])
    );

    useEffect(() => {
  const fetchUserAndCommunities = async () => {
    try {
      const user = await fetchUserDetails();
      if (user && (user.name || user.userId || user.email)) {
        setUserName(String(user.name || user.userId || user.email));
      } else {
        setUserName('User');
      }
      let orgId = null;
      let role = 'Member'; // Default role
      
      if (
        user.OrganizationUsers &&
        Array.isArray(user.OrganizationUsers) &&
        user.OrganizationUsers.length > 0
      ) {
        const activeOrgUser = user.OrganizationUsers.find(
          (ou) => ou.status === 'Active' && ou.Organization && ou.Organization.id,
        );
        if (activeOrgUser) {
          orgId = activeOrgUser.Organization.id;
          role = activeOrgUser.role || 'Member'; // Capture role for button check
        }
      }
      setUserRole(role); // Save to state
      
      if (orgId) {
        console.log(`Fetching communities for organizationId: ${orgId}...`);
        setOrganizationId(orgId);
        const data = await fetchCommunitiesByOrganization(orgId);
        console.log('Communities fetched from API:', data);
        setCommunities(data || []);
        console.log('Communities set in state:', data);
      } else {
        console.warn('User does not belong to any active organization');
        setCommunities([]);
      }
      // Log full user object with nested details expanded
      console.log('User details:', JSON.stringify(user, null, 2));
    } catch (error) {
      console.error('Failed to fetch user or communities:', error.message);
      setUserName('User');
      setCommunities([]);
      setUserRole('Member');
    } finally {
      setLoading(false);
    }
  };
  fetchUserAndCommunities();
}, []);


    const filteredCommunities = communities.filter((comm) =>
        comm.name.toLowerCase().includes(search.toLowerCase()),
    );
    if (loading) {
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
                ]}>
                <Text style={{ color: theme.text }}>{t('loading')}...</Text>
            </View>
        );
    }

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
                    },
                ]}>
                <View style={{ flex: 1 }}>
                    <Text
                        style={[
                            styles.bannerTitle,
                            {
                                fontSize: isTablet ? 26 : 22,
                                marginBottom: isTablet ? 4 : 2,
                            },
                        ]}>
                        {t('communities')}
                    </Text>
                    <Text
                        style={[
                            styles.bannerDesc,
                            {
                                fontSize: isTablet ? 16 : 14,
                                maxWidth: isTablet ? '85%' : '80%',
                            },
                        ]}>
                        {`${t('all_your_communities')}, ${userName}`}
                    </Text>
                </View>
{userRole === "Owner" && (
  <TouchableOpacity
    style={[
      styles.bannerAction,
      {
        borderRadius: isTablet ? 14 : 12,
        paddingHorizontal: isTablet ? 20 : 16,
        paddingVertical: isTablet ? 12 : 8,
      },
    ]}
    onPress={() => setCreateModalVisible(true)}>
    <Text style={[styles.bannerActionText, { fontSize: isTablet ? 16 : 15 }]}>{t('add')}</Text>
    <Feather
      name="users"
      size={isTablet ? 20 : 18}
      color="#fff"
      style={{ marginLeft: isTablet ? 6 : 4 }}
    />
  </TouchableOpacity>
)}

            </LinearGradient>
            <View
                style={[
                    styles.searchBarContainer,
                    {
                        backgroundColor: theme.SearchBar,
                        marginHorizontal: isTablet ? 24 : 20,
                        paddingHorizontal: isTablet ? 20 : 16,
                        paddingVertical: isTablet ? 16 : 12,
                        borderRadius: isTablet ? 14 : 12,
                    },
                ]}>
                <TextInput
                    style={[
                        styles.searchInput,
                        {
                            color: theme.text,
                            fontSize: isTablet ? 18 : 16,
                        },
                    ]}
                    placeholder={t('search_community')}
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={filteredCommunities}
                keyExtractor={(item) => item.communityId.toString()}
                numColumns={isTablet ? 3 : 1}
                key={isTablet ? 'tablet' : 'mobile'}
                contentContainerStyle={{ padding: isTablet ? 24 : 16 }}
                columnWrapperStyle={isTablet ? { justifyContent: 'space-between' } : null}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.communityCard,
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
                        onPress={() => navigation.navigate('CommunityDetailsScreen', { communityId: item.communityId })}
                        activeOpacity={0.8}>
                        <Text
                            style={[
                                styles.name,
                                {
                                    color: theme.text,
                                    fontSize: isTablet ? 18 : 16,
                                    fontWeight: '600',
                                },
                            ]}>
                            {item.name}
                        </Text>
                        <Text
                            numberOfLines={2}
                            style={{
                                marginTop: 6,
                                color: theme.secondaryText,
                                fontSize: isTablet ? 14 : 13,
                                fontWeight: '400',
                            }}>
                            {item.description || t('no_description')}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>
                        {t('no_communities_found')}
                    </Text>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}        // <--- This must match the defined function above
                        colors={['#366CD9']}
                        tintColor={'#366CD9'}
                    />
                }
            />
            <CreateCommunityModal
                visible={isCreateModalVisible}
                onClose={() => setCreateModalVisible(false)}
                organizationId={organizationId}
                onCreate={async (orgId, name, desc, visibility) => {
                    await createCommunity(orgId, name, desc, visibility);
                    // Refetch communities after creation
                    const newCommunities = await fetchCommunitiesByOrganization(orgId);
                    setCommunities(newCommunities);
                }}
            />
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
        fontWeight: '600',
        marginBottom: 2,
    },
    bannerDesc: {
        color: '#e6eaf3',
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
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 0,
    },
    searchInput: {
        flex: 1,
        fontWeight: '400',
        opacity: 0.7,
        paddingVertical: 0,
    },
    communityCard: {
        borderWidth: 1,
        borderRadius: 14,
    },
    name: {},
});
