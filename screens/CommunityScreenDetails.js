import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fetchCommunityDetail } from '../utils/community';
import { useTranslation } from 'react-i18next';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth >= 768;

export default function CommunityDetailsScreen({ route, navigation }) {
  const { communityId } = route.params;
  const theme = useTheme();
  const { t } = useTranslation();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCommunityDetail = async () => {
      try {
        setLoading(true);
        const data = await fetchCommunityDetail(communityId);
        setCommunity(data);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadCommunityDetail();
  }, [communityId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !community) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'red' }}>{error || t('community_not_found')}</Text>
      </View>
    );
  }

  // Calculate overall projects' progress (if available)
  const progressPercent = Math.round(
    (community.communityProjects?.reduce((acc, p) => acc + (p.progress || 0), 0) || 0) /
      (community.communityProjects?.length || 1)
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        bounces
      >
        {/* Header (Name only in gradient card) */}
        <View style={{ marginHorizontal: isTablet ? 40 : 20, marginTop: Platform.OS === 'ios' ? 60 : 20, marginBottom: 0 }}>
          <LinearGradient
            colors={['#011F53', '#366CD9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.headerCard, { borderRadius: isTablet ? 20 : 16, minHeight: isTablet ? 130 : 110 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {community.name}
              </Text>
            </View>
            <TouchableOpacity>
              <Feather name="more-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Description card below header */}
        <View
          style={[
            styles.descriptionCard,
            {
              marginHorizontal: isTablet ? 40 : 20,
              marginBottom: 12,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={styles.descriptionLabel}>{t('description')}</Text>
          <Text
            style={[
              styles.descriptionText,
              { color: theme.text }
            ]}
            numberOfLines={5}
            ellipsizeMode="tail"
          >
            {community.description?.trim()
              ? community.description
              : t('no_description')}
          </Text>
        </View>

        {/* Tabs (optional: non-functional here for reference look) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabButtonsWrapper}
          style={styles.tabButtonsContainer}
        >
          <TouchableOpacity style={styles.tabButton}>
            <MaterialIcons name="group" size={16} color={theme.primary} />
            <Text style={styles.tabButtonText}>{t('Members')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton}>
            <Feather name="folder" size={16} color={theme.primary} />
            <Text style={styles.tabButtonText}>{t('Projects')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton}>
            <Feather name="bell" size={16} color={theme.primary} />
            <Text style={styles.tabButtonText}>{t('Announcements')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>{t('Progress')}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: '#366CD9' }]} />
            <Text style={[styles.statusText, { color: '#366CD9' }]}>{t('active')}</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={{ color: theme.text, alignSelf: 'flex-end', marginRight: isTablet ? 40 : 20, fontSize: 12 }}>
          {progressPercent}% {t('complete')}
        </Text>

        {/* Members List */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>{t('Members')}</Text>
          <FlatList
            data={community.communityMembers || []}
            keyExtractor={(item) => item.user.userId.toString()}
            renderItem={({ item }) => (
              <Text style={{ color: theme.text, marginLeft: 20, marginBottom: 8 }}>
                {item.user.name || item.user.email} - {item.role}
              </Text>
            )}
            ListEmptyComponent={<Text style={{ color: theme.secondaryText, textAlign: 'center' }}>{t('no_members')}</Text>}
            scrollEnabled={false}
          />
        </View>

        {/* Projects (Worklists style) */}
        <View style={{ marginTop: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: isTablet ? 40 : 20, marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{t('Projects')}</Text>
            <TouchableOpacity>
              <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 14 }}>{t('View All')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={community.communityProjects || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.projectCard}>
                <Text style={styles.projectCardName}>{item.projectName}</Text>
                <Text style={styles.projectCardTasks}>{(item.tasksCount || 0) + ' ' + t('Tasks')}</Text>
                <View style={styles.projectCardProgressBg}>
                  <View style={[styles.projectCardProgress, { width: `${item.progress || 0}%` }]} />
                  <Text style={styles.projectCardProgressText}>{item.progress || 0}%</Text>
                </View>
              </View>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: isTablet ? 40 : 20, paddingRight: isTablet ? 40 : 20 }}
            ListEmptyComponent={<Text style={{ color: theme.secondaryText, textAlign: 'center' }}>{t('no_projects')}</Text>}
          />
        </View>

        {/* Announcements */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.sectionTitle}>{t('Announcements')}</Text>
          <FlatList
            data={community.announcements || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={{ marginHorizontal: isTablet ? 40 : 20, marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.announcementCreator.name}:</Text>
                <Text style={{ color: theme.text }}>{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: theme.secondaryText, textAlign: 'center' }}>{t('no_announcements')}</Text>}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTablet ? 24 : 20,
    marginTop: 0,
    marginBottom: 0,
    minHeight: 110,
  },
  headerTitle: {
    color: '#fff',
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    marginBottom: isTablet ? 8 : 6,
  },
  descriptionCard: {
    borderRadius: isTablet ? 14 : 10,
    borderWidth: 1,
    paddingHorizontal: isTablet ? 18 : 14,
    minHeight: isTablet ? 64 : 54,
    paddingVertical: isTablet ? 12 : 8,
    elevation: 2,
    marginTop: isTablet ? 16 : 10,
    marginBottom: isTablet ? 16 : 10,
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '400',
  },
  tabButtonsContainer: {
    marginTop: isTablet ? 4 : 2,
  },
  tabButtonsWrapper: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: isTablet ? 40 : 20,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    marginRight: 12,
  },
  tabButtonText: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
    color: '#222',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: isTablet ? 40 : 20,
    marginTop: isTablet ? 12 : 8,
    marginBottom: isTablet ? 8 : 4,
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontWeight: '400',
    fontSize: isTablet ? 18 : 16,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  statusText: { fontWeight: '400', fontSize: isTablet ? 16 : 14 },
  progressBarBg: {
    width: '90%',
    height: 6,
    backgroundColor: '#ECF0FF',
    borderRadius: 6,
    marginHorizontal: isTablet ? 40 : 20,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#366CD9',
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    marginHorizontal: isTablet ? 40 : 20,
    marginTop: 0,
    marginBottom: 10,
  },
  projectCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 16,
    width: 210,
  },
  projectCardName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  projectCardTasks: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  projectCardProgressBg: {
    height: 4,
    backgroundColor: '#ECF0FF',
    borderRadius: 5,
    marginBottom: 0,
    marginTop: 8,
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  projectCardProgress: {
    height: 4,
    backgroundColor: '#366CD9',
    borderRadius: 5,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  projectCardProgressText: {
    fontSize: 12,
    color: '#366CD9',
    fontWeight: '500',
    position: 'absolute',
    right: 4,
    top: -14,
  },
});
