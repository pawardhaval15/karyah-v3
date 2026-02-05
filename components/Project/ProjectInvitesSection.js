import { Feather } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { getMyProjectInvites, respondToProjectInvite } from '../../utils/connections';

const InviteCard = memo(({ invite, theme, t, onResponse, isResponding }) => {
  const project = invite.project || invite.Project;
  const inviter = invite.inviter || invite.invitedByUser;
  const projectName = project?.projectName || 'Unknown Project';
  const inviterName = inviter?.name || 'Unknown';
  const location = project?.location;

  return (
    <View style={[styles.inviteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.projectTitle, { color: theme.text }]} numberOfLines={1}>
          {projectName}
        </Text>
        <View style={[styles.inviteTag, { backgroundColor: `${theme.primary}15` }]}>
          <Text style={[styles.inviteTagText, { color: theme.primary }]}>Invite</Text>
        </View>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
        <View style={[styles.progressBar, { width: '0%', backgroundColor: theme.primary }]} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.inviterGroup}>
          <View style={[styles.inviterAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.inviterInitial}>{inviterName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.inviterName, { color: theme.text }]} numberOfLines={1}>
            {inviterName}
          </Text>
        </View>
        {location && (
          <View style={styles.locationInfo}>
            <Feather name="map-pin" size={10} color={theme.secondaryText} />
            <Text style={[styles.locationText, { color: theme.secondaryText }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.declineButton, { borderColor: theme.border }]}
          onPress={() => onResponse(invite, 'decline')}
          disabled={isResponding}
        >
          <Feather name="x" size={14} color={theme.secondaryText} />
          <Text style={[styles.declineButtonText, { color: theme.secondaryText }]}>{t('decline')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: theme.primary }]}
          onPress={() => onResponse(invite, 'accept')}
          disabled={isResponding}
        >
          {isResponding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={14} color="#fff" />
              <Text style={styles.acceptButtonText}>{t('accept')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ProjectInvitesSection = ({ theme, onInviteResponse }) => {
  const { t } = useTranslation();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respondingToInvite, setRespondingToInvite] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      const invitesData = await getMyProjectInvites();
      setInvites(invitesData || []);
    } catch (error) {
      console.error('Error fetching project invites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleInviteResponse = async (invite, action) => {
    const inviteId = invite.id;
    const projectName = invite.project?.projectName || invite.Project?.projectName || 'this project';

    Alert.alert(
      action === 'accept' ? t('accept') : t('decline'),
      `${action === 'accept' ? t('confirm_accept_invite') : t('confirm_decline_invite')} "${projectName}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: action === 'accept' ? t('accept') : t('decline'),
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setRespondingToInvite(inviteId);
              await respondToProjectInvite(inviteId, action);
              setInvites(prev => prev.filter(inv => inv.id !== inviteId));
              if (onInviteResponse) onInviteResponse(action);
              Alert.alert('Success', action === 'accept' ? t('invite_accepted_success') : t('invite_declined_success'));
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to respond to invite');
            } finally {
              setRespondingToInvite(null);
            }
          }
        }
      ]
    );
  };

  if (!invites.length && !loading) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('project_invites')}</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.countText}>{invites.length}</Text>
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.secondaryText} />
      </TouchableOpacity>

      {expanded && (
        <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout.springify()}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {invites.map((invite, idx) => (
                <InviteCard
                  key={invite.id || idx}
                  invite={invite}
                  theme={theme}
                  t={t}
                  onResponse={handleInviteResponse}
                  isResponding={respondingToInvite === invite.id}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  scrollContent: { paddingLeft: 16, paddingRight: 8, paddingVertical: 12 },
  inviteCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  projectTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  inviteTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  inviteTagText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  progressBarBg: { height: 4, borderRadius: 2, marginBottom: 12 },
  progressBar: { height: 4, borderRadius: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  inviterGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  inviterAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  inviterInitial: { color: '#fff', fontSize: 10, fontWeight: '800' },
  inviterName: { fontSize: 12, fontWeight: '500', flex: 1 },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '40%' },
  locationText: { fontSize: 11, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8 },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  declineButtonText: { fontSize: 13, fontWeight: '700' },
  acceptButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  loader: { paddingVertical: 20 },
});

export default memo(ProjectInvitesSection);
