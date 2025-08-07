import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getUserIdFromToken } from '../utils/auth';
import {
  getMessagesByProject,
  postMessage,
  reactToMessage,
  togglePinMessage,
} from '../utils/discussion';
import { getAccessByProject } from '../utils/projectAccess';

export default function ProjectDiscussionScreen({ route, navigation }) {
  const { projectId, projectName } = route.params;
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userAccess, setUserAccess] = useState({
    canView: false,
    canReply: false,
    canEdit: false,
  });
  const [accessLoading, setAccessLoading] = useState(true);
  const [selectedPinnedMessage, setSelectedPinnedMessage] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    fetchCurrentUser();
    checkUserAccess();
  }, [projectId]);

  useEffect(() => {
    if (userAccess.canView) {
      fetchMessages();
    }
  }, [userAccess.canView]);

  const fetchCurrentUser = async () => {
    try {
      const userId = await getUserIdFromToken();
      setCurrentUserId(userId);
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
  };

  const checkUserAccess = async () => {
    try {
      setAccessLoading(true);
      const accesses = await getAccessByProject(projectId);
      const userId = await getUserIdFromToken();

      // Find discussion access for current user
      const discussionAccess = accesses.find(
        (access) => access.userId === userId && access.module === 'discussion'
      );

      if (discussionAccess) {
        setUserAccess({
          canView: discussionAccess.canView || false,
          canReply: discussionAccess.canReply || false,
          canEdit: discussionAccess.canEdit || false,
        });
      } else {
        // Default access if no specific access is set (you might want to change this logic)
        setUserAccess({
          canView: true, // Allow viewing by default
          canReply: false,
          canEdit: false,
        });
      }
    } catch (error) {
      console.error('Failed to check user access:', error);
      // On error, allow basic access
      setUserAccess({
        canView: true,
        canReply: false,
        canEdit: false,
      });
    } finally {
      setAccessLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getMessagesByProject(projectId);
      // Backend returns messages array directly, not wrapped in a messages property
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      Alert.alert('Error', 'Failed to load discussion messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !userAccess.canReply) return;

    try {
      setSending(true);
      const messageData = {
        content: newMessage.trim(),
        type: 'text',
      };

      const response = await postMessage(projectId, messageData);
      // Backend returns the message directly, but we need to add user info for immediate display
      const messageWithUserInfo = {
        ...response,
        User: {
          name: 'You', // Since it's the current user's message
          userId: currentUserId,
        },
      };

      setMessages((prev) => [...prev, messageWithUserInfo]);
      setNewMessage('');

      // Scroll to top to show the new message (since messages are reversed)
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, reactionType) => {
    try {
      const reactionData = {
        reaction: reactionType,
        userId: currentUserId,
      };
      const response = await reactToMessage(messageId, reactionData);

      // Update local messages with new reaction data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: response.reactions || msg.reactions,
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to react to message:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  const handleTogglePin = async (messageId) => {
    if (!userAccess.canEdit) {
      Alert.alert('Access Denied', 'You do not have permission to pin messages');
      return;
    }

    try {
      // Find the current message to determine its pin status
      const currentMessage = messages.find((msg) => msg.id === messageId);
      const currentPinStatus = currentMessage?.isPinned || currentMessage?.pinned || false;
      const newPinStatus = !currentPinStatus;

      const requestData = {
        pin: newPinStatus,
        userId: currentUserId,
      };

      const response = await togglePinMessage(messageId, requestData);

      // Update local messages with new pin status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isPinned: response.pinned || newPinStatus,
                pinned: response.pinned || newPinStatus,
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      Alert.alert('Error', 'Failed to toggle pin status');
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.senderId === currentUserId;
    const isPinned = message.isPinned || message.pinned;
    const isSelected = selectedPinnedMessage === message.id;

    // Check if this is a consecutive message from the same sender
    const reversedMessages = [...messages].reverse();
    const prevMessage = reversedMessages[index - 1];
    const nextMessage = reversedMessages[index + 1];
    
    const isSameSenderAsPrevious = prevMessage && prevMessage.senderId === message.senderId;
    const isSameSenderAsNext = nextMessage && nextMessage.senderId === message.senderId;
    
    // Determine message bubble styling
    const isFirstInGroup = !isSameSenderAsPrevious;
    const isLastInGroup = !isSameSenderAsNext;

    // Handle reactions - could be object or array format
    let reactions = [];
    if (message.reactions && typeof message.reactions === 'object') {
      if (Array.isArray(message.reactions)) {
        reactions = message.reactions;
      } else {
        // Convert object format to array for display
        reactions = Object.entries(message.reactions).map(([userId, reaction]) => ({
          userId,
          type: reaction,
          count: 1,
        }));
      }
    }

    const totalReactions = reactions.length;

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          { 
            alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
            marginBottom: isLastInGroup ? 16 : 3,
            marginTop: isFirstInGroup ? 8 : 0,
          }
        ]}>
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? theme.primary : theme.card,
              borderColor: isSelected ? theme.primary : theme.border,
              borderWidth: isSelected ? 2 : 1,
              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
              shadowColor: isSelected ? theme.primary : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isSelected ? 0.3 : 0,
              shadowRadius: isSelected ? 4 : 0,
              elevation: isSelected ? 3 : 1,
              // WhatsApp-like bubble shaping
              borderTopLeftRadius: isOwnMessage ? 16 : (isFirstInGroup ? 16 : 4),
              borderTopRightRadius: isOwnMessage ? (isFirstInGroup ? 16 : 4) : 16,
              borderBottomLeftRadius: isOwnMessage ? 16 : (isLastInGroup ? 16 : 4),
              borderBottomRightRadius: isOwnMessage ? (isLastInGroup ? 16 : 4) : 16,
            },
          ]}>
          
          {/* Show sender name only for first message in group from others */}
          {!isOwnMessage && isFirstInGroup && (
            <View style={styles.messageHeader}>
              <Text style={[styles.senderName, { color: theme.primary }]}>
                {message.User?.name || message.sender?.name || 'Unknown User'}
              </Text>
              {isPinned && (
                <View style={styles.pinnedBadge}>
                  <MaterialIcons name="push-pin" size={12} color={theme.primary} />
                </View>
              )}
            </View>
          )}

          {/* Show pinned badge for own messages */}
          {isOwnMessage && isPinned && (
            <View style={[styles.messageHeader, { justifyContent: 'flex-end' }]}>
              <View style={styles.pinnedBadge}>
                <MaterialIcons name="push-pin" size={12} color="rgba(255,255,255,0.8)" />
              </View>
            </View>
          )}

          <Text style={[styles.messageText, { color: isOwnMessage ? '#fff' : theme.text }]}>
            {message.content}
          </Text>

          {/* Always show time and actions for better UX */}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.secondaryText },
              ]}>
              {formatMessageTime(message.createdAt)}
            </Text>

            <View style={styles.messageActions}>
              <TouchableOpacity
                onPress={() => handleReaction(message.id, 'like')}
                style={styles.actionButton}>
                <MaterialIcons
                  name="thumb-up"
                  size={14}
                  color={isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.secondaryText}
                />
              </TouchableOpacity>

              {userAccess.canEdit && (
                <TouchableOpacity
                  onPress={() => handleTogglePin(message.id)}
                  style={styles.actionButton}>
                  <MaterialIcons
                    name="push-pin"
                    size={14}
                    color={
                      message.isPinned || message.pinned
                        ? theme.primary
                        : isOwnMessage
                          ? 'rgba(255,255,255,0.7)'
                          : theme.secondaryText
                    }
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {totalReactions > 0 && (
            <View style={styles.reactionsContainer}>
              {reactions.slice(0, 3).map((reaction, idx) => (
                <View
                  key={idx}
                  style={[styles.reactionBadge, { backgroundColor: theme.background }]}>
                  <Text style={[styles.reactionText, { color: theme.text }]}>
                    👍 {reaction.count || 1}
                  </Text>
                </View>
              ))}
              {totalReactions > 3 && (
                <View style={[styles.reactionBadge, { backgroundColor: theme.background }]}>
                  <Text style={[styles.reactionText, { color: theme.text }]}>
                    +{totalReactions - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Separate pinned messages for the sticky header
  const pinnedMessages = messages.filter((msg) => msg.isPinned || msg.pinned);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Discussion</Text>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>{projectName}</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <MaterialIcons name="info-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Sticky Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <View
          style={[
            styles.stickyPinnedSection,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}>
          <View style={styles.pinnedHeader}>
            <MaterialIcons name="push-pin" size={16} color={theme.primary} />
            <Text style={[styles.pinnedHeaderText, { color: theme.primary }]}>
              {pinnedMessages.length} Pinned
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pinnedMessagesScroll}>
            {pinnedMessages.map((message) => {
              const isSelected = selectedPinnedMessage === message.id;
              const senderName = message.User?.name || message.sender?.name || 'Unknown';
              
              return (
                <TouchableOpacity
                  key={`pinned-${message.id}`}
                  style={[
                    styles.compactPinnedMessage,
                    { 
                      backgroundColor: theme.background, 
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                      shadowColor: isSelected ? theme.primary : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSelected ? 0.3 : 0,
                      shadowRadius: isSelected ? 4 : 0,
                      elevation: isSelected ? 4 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPinnedMessage(isSelected ? null : message.id);
                    // Scroll to the message in the main chat (accounting for reversed order)
                    const messageIndex = messages.findIndex((msg) => msg.id === message.id);
                    if (messageIndex !== -1) {
                      const reversedIndex = messages.length - 1 - messageIndex;
                      scrollViewRef.current?.scrollTo({ y: reversedIndex * 80, animated: true });
                    }
                  }}>
                  <Text style={[styles.compactPinnedText, { color: theme.text }]} numberOfLines={1}>
                    {senderName}: {message.content}
                  </Text>
                  {userAccess.canEdit && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTogglePin(message.id);
                      }}
                      style={styles.compactUnpinButton}>
                      <MaterialIcons name="close" size={14} color={theme.secondaryText} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // Since messages are reversed, scroll to top to see latest messages
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
          }}>
          {accessLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                Checking access permissions...
              </Text>
            </View>
          ) : !userAccess.canView ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="lock" size={48} color={theme.secondaryText} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Access Restricted</Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                You don't have permission to view this discussion. Contact the project admin for
                access.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                Loading discussion...
              </Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color={theme.secondaryText} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Start the Discussion</Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                {userAccess.canReply
                  ? 'Be the first to share your thoughts about this project'
                  : 'No messages yet. You can view messages but cannot post replies.'}
              </Text>
            </View>
          ) : (
            // Show all messages in reverse chronological order (latest first, like WhatsApp)
            [...messages].reverse().map((message, index) => renderMessage(message, index))
          )}
        </ScrollView>

        {/* Input - Only show if user can reply and has view access */}
        {userAccess.canView && (
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.card, borderTopColor: theme.border },
            ]}>
            {userAccess.canReply ? (
              <>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Type your message..."
                  placeholderTextColor={theme.secondaryText}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: newMessage.trim() && !sending ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleSendMessage}
                  disabled={!newMessage.trim() || sending}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View
                style={[
                  styles.restrictedInputContainer,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}>
                <MaterialIcons name="lock" size={20} color={theme.secondaryText} />
                <Text style={[styles.restrictedInputText, { color: theme.secondaryText }]}>
                  You can view messages but cannot reply
                </Text>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerAction: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  messageContainer: {
    marginBottom: 3,
    maxWidth: '85%',
    paddingHorizontal: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pinnedBadge: {
    marginLeft: 8,
  },
  stickyPinnedSection: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 60,
  },
  pinnedMessagesScroll: {
    marginTop: 4,
  },
  compactPinnedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    maxWidth: 250,
  },
  compactPinnedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  compactUnpinButton: {
    marginLeft: 8,
    padding: 2,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  pinnedMessageContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  pinnedSection: {
    marginBottom: 16,
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  messageBubble: {
    padding: 10,
    borderWidth: 1,
    minWidth: 100,
    maxWidth: '100%',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 11,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  reactionBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictedInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  restrictedInputText: {
    fontSize: 14,
    marginLeft: 8,
    fontStyle: 'italic',
  },
});
