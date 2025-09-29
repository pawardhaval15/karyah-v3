import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import { getMyProjectInvites, respondToProjectInvite } from '../../utils/connections';

export default function ProjectInvitesSection({ theme, onInviteResponse }) {
  const { t } = useTranslation();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respondingToInvite, setRespondingToInvite] = useState(null);
  const [expanded, setExpanded] = useState(false); // Default closed

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const invitesData = await getMyProjectInvites();
      console.log('📨 Project invites data:', JSON.stringify(invitesData, null, 2));
      setInvites(invitesData);
    } catch (error) {
      console.error('Error fetching project invites:', error);
      Alert.alert('Error', 'Failed to fetch project invites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleInviteResponse = async (inviteId, action) => {
    try {
      setRespondingToInvite(inviteId);
      await respondToProjectInvite(inviteId, action);

      // Remove the invite from local state
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));

      // Notify parent component
      if (onInviteResponse) {
        onInviteResponse(action);
      }

      Alert.alert(
        'Success',
        action === 'accept' ? t('invite_accepted_success') : t('invite_declined_success')
      );
    } catch (error) {
      console.error('Error responding to invite:', error);
      Alert.alert('Error', error.message || 'Failed to respond to invite');
    } finally {
      setRespondingToInvite(null);
    }
  };

  const confirmResponse = (invite, action) => {
    const actionText = action === 'accept' ? t('accept') : t('decline');
    const confirmMessage =
      action === 'accept' ? t('confirm_accept_invite') : t('confirm_decline_invite');
    Alert.alert(
      `${actionText} ${t('project_invites').slice(0, -1)}`, // Remove 's' from 'Invites'
      `${confirmMessage} "${invite.project?.projectName || invite.Project?.projectName || 'this project'}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: actionText,
          onPress: () => handleInviteResponse(invite.id, action),
          style: action === 'accept' ? 'default' : 'destructive',
        },
      ]
    );
  };

  const renderInviteItem = ({ item: invite }) => (
    <View style={[styles.inviteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Project Title with Invite Tag */}
      <View style={styles.titleRow}>
        <Text style={[styles.projectTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
          {invite.project?.projectName || invite.Project?.projectName || 'Unknown Project'}
        </Text>
        <View style={[styles.inviteTag, { backgroundColor: theme.primary + '10' }]}>
          <Text style={[styles.inviteTagText, { color: theme.primary }]}>Invite</Text>
        </View>
      </View>

      {/* Progress bar placeholder (no actual progress for invites) */}
      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
        <View style={[styles.progressBar, { width: '0%', backgroundColor: theme.primary }]} />
      </View>

      {/* Row with inviter info and location */}
      <View style={styles.metaRow}>
        <View style={styles.inviterGroup}>
          <View style={[styles.inviterAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.inviterInitial}>
              {(invite.inviter?.name || invite.invitedByUser?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.inviterName, { color: theme.text }]} numberOfLines={1}>
            {invite.inviter?.name || invite.invitedByUser?.name || 'Unknown'}
          </Text>
        </View>
        <View style={styles.projectMeta}>
          {(invite.project?.location || invite.Project?.location) && (
            <View style={styles.locationInfo}>
              <Feather name="map-pin" size={11} color={theme.secondaryText} />
              <Text style={[styles.locationText, { color: theme.secondaryText }]}>
                {invite.project?.location || invite.Project?.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.declineButton, { borderColor: theme.border + '80' }]}
          onPress={() => confirmResponse(invite, 'decline')}
          disabled={respondingToInvite === invite.id}>
          <Feather name="x" size={14} color={theme.secondaryText} />
          <Text style={[styles.declineButtonText, { color: theme.secondaryText }]}>
            {t('decline')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: theme.primary }]}
          onPress={() => confirmResponse(invite, 'accept')}
          disabled={respondingToInvite === invite.id}>
          {respondingToInvite === invite.id ? (
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

  if (!invites.length && !loading) {
    return null; // Don't show section if no invites
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity 
        style={[styles.sectionRow, { borderColor: theme.border + '80', backgroundColor: theme.card }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('project_invites')} <Text style={{ color: theme.text, fontWeight: '600', fontSize: 20, marginLeft: 12 }}>{invites.length}</Text>
        </Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.secondaryText}
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.sectionContent}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, marginBottom: 0 }}
            >
              {invites.map((invite, idx) => (
                <View key={invite.id || idx}>
                  {renderInviteItem({ item: invite })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 0,
    justifyContent: 'space-between',
    borderWidth:1,
    padding:12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 0,
  },
  sectionContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  loader: {
    paddingVertical: 12,
  },
  inviteCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    paddingVertical: 16,
    maxWidth: 240,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  projectTitle: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  inviteTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inviteTagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
    marginTop: 2,
    width: '100%',
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 2,
    width: '100%',
  },
  inviterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  inviterInitial: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  inviterName: {
    fontSize: 11,
    fontWeight: '400',
    flex: 1,
  },
  projectMeta: {
    alignItems: 'flex-end',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '400',
    maxWidth: 80,
  },
  categoryRow: {
    marginBottom: 8,
    marginTop: 2,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  acceptButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
