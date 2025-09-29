import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import useAttachmentPicker from './useAttachmentPicker';

export default function TaskChatPopup({
  visible,
  onClose,
  messages = [],
  onSend,
  theme,
  currentUserId,
  loading = false,
  users = [],
  task = null,
}) {
  // Use local attachment picker state
  const { attachments, pickAttachment, clearAttachments, setAttachments, attaching } =
    useAttachmentPicker();
  const [input, setInput] = useState('');
  const [showTimeIdx, setShowTimeIdx] = useState(null);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const [imageModal, setImageModal] = useState({ visible: false, uri: null });
  const [localMessages, setLocalMessages] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);
  const [mentionMap, setMentionMap] = useState({});

  // Auto-scroll to bottom when messages change or popup opens
  useEffect(() => {
    if (visible && (messages?.length > 0 || allMessages?.length > 0)) {
      // Use a longer timeout to ensure the component is fully rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, messages?.length, allMessages?.length]);

  // Additional scroll effect for when allMessages updates
  useEffect(() => {
    if (visible && allMessages?.length > 0) {
      // Scroll to bottom when new messages are added
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages?.length, visible]);

  // Ensure scroll to latest message when popup opens
  useEffect(() => {
    if (visible) {
      // Multiple attempts to scroll to ensure it works
      const scrollToBottom = () => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      };
      
      // Immediate scroll
      scrollToBottom();
      
      // Delayed scrolls to handle different loading states
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [visible]);

  // Sync server messages with local messages
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Remove a single attachment by index
  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Close mentions dropdown
  const closeMentions = () => {
    setShowMentions(false);
    setMentionStartIndex(-1);
    setMentionSearch('');
  };

  // Generate temporary message ID
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get mentionable users (task creator, assigned users, and chat participants)
  const getMentionableUsers = () => {
    const chatUsers = new Map();

    console.log('[TaskChatPopup] DEBUG - Task object:', JSON.stringify(task, null, 2));

    // ALWAYS add task creator (including current user - they might want to mention themselves in some cases)
    if (task?.creator) {
      const creatorId = task.creator.userId || task.creator.id || task.creator._id;
      const creatorName = task.creator.name || task.creator.username || task.creator.fullName || 'Task Creator';
      
      console.log('[TaskChatPopup] DEBUG - Found creator in task.creator:', { creatorId, creatorName, creator: task.creator });
      
      if (creatorId) {
        chatUsers.set(creatorId, {
          id: creatorId,
          name: creatorName,
          userId: creatorId,
          role: 'creator',
        });
      }
    }

    // Also check if task has createdBy field as fallback
    if (task?.createdBy && !chatUsers.has(task.createdBy.userId || task.createdBy.id || task.createdBy._id)) {
      const creatorId = task.createdBy.userId || task.createdBy.id || task.createdBy._id;
      const creatorName = task.createdBy.name || task.createdBy.username || task.createdBy.fullName || 'Task Creator';
      
      console.log('[TaskChatPopup] DEBUG - Found creator in task.createdBy:', { creatorId, creatorName, createdBy: task.createdBy });
      
      if (creatorId) {
        chatUsers.set(creatorId, {
          id: creatorId,
          name: creatorName,
          userId: creatorId,
          role: 'creator',
        });
      }
    }

    // Check if task has a direct creatorId and creatorName fields
    if (task?.creatorId && task?.creatorName && !chatUsers.has(task.creatorId)) {
      console.log('[TaskChatPopup] DEBUG - Found creator in direct fields:', { creatorId: task.creatorId, creatorName: task.creatorName });
      
      chatUsers.set(task.creatorId, {
        id: task.creatorId,
        name: task.creatorName,
        userId: task.creatorId,
        role: 'creator',
      });
    }

    // Check if task has creatorUserId and creatorName fields (THIS IS THE FIX!)
    if (task?.creatorUserId && task?.creatorName && !chatUsers.has(task.creatorUserId)) {
      console.log('[TaskChatPopup] DEBUG - Found creator in creatorUserId fields:', { creatorUserId: task.creatorUserId, creatorName: task.creatorName });
      
      chatUsers.set(task.creatorUserId, {
        id: task.creatorUserId,
        name: task.creatorName,
        userId: task.creatorUserId,
        role: 'creator',
      });
    }

    // Check if task has createdByUser field
    if (task?.createdByUser && !chatUsers.has(task.createdByUser.userId || task.createdByUser.id || task.createdByUser._id)) {
      const creatorId = task.createdByUser.userId || task.createdByUser.id || task.createdByUser._id;
      const creatorName = task.createdByUser.name || task.createdByUser.username || task.createdByUser.fullName || 'Task Creator';
      
      console.log('[TaskChatPopup] DEBUG - Found creator in task.createdByUser:', { creatorId, creatorName, createdByUser: task.createdByUser });
      
      if (creatorId) {
        chatUsers.set(creatorId, {
          id: creatorId,
          name: creatorName,
          userId: creatorId,
          role: 'creator',
        });
      }
    }

    // ALWAYS add assigned users
    if (task?.assignedUserDetails && Array.isArray(task.assignedUserDetails)) {
      task.assignedUserDetails.forEach((user) => {
        const userId = user.userId || user.id || user._id;
        const userName = user.name || user.username || user.fullName || 'Assigned User';
        
        console.log('[TaskChatPopup] DEBUG - Found assigned user in assignedUserDetails:', { userId, userName, user });
        
        if (userId && !chatUsers.has(userId)) {
          chatUsers.set(userId, {
            id: userId,
            name: userName,
            userId: userId,
            role: 'assigned',
          });
        }
      });
    }

    // Also check assignedUsers field as fallback
    if (task?.assignedUsers && Array.isArray(task.assignedUsers)) {
      task.assignedUsers.forEach((user) => {
        const userId = user.userId || user.id || user._id;
        const userName = user.name || user.username || user.fullName || 'Assigned User';
        
        console.log('[TaskChatPopup] DEBUG - Found assigned user in assignedUsers:', { userId, userName, user });
        
        if (userId && !chatUsers.has(userId)) {
          chatUsers.set(userId, {
            id: userId,
            name: userName,
            userId: userId,
            role: 'assigned',
          });
        }
      });
    }

    // Then, collect all users who have sent messages in this chat
    const allChatMessages = [...messages, ...localMessages.filter((msg) => !msg.isTemp)];
    allChatMessages.forEach((msg) => {
      if (msg.sender) {
        const userId = msg.senderId || msg.userId || msg.sender.userId || msg.sender.id || msg.sender._id;
        const userName = msg.sender.name || msg.sender.username || msg.sender.fullName || 'Chat Participant';
        
        console.log('[TaskChatPopup] DEBUG - Found message sender:', { userId, userName, sender: msg.sender });
        
        if (userId && !chatUsers.has(userId)) {
          chatUsers.set(userId, {
            id: userId,
            name: userName,
            userId: userId,
            role: 'participant',
          });
        }
      }
    });

    // Convert to array and sort by role priority (creator > assigned > participants)
    const usersArray = Array.from(chatUsers.values());
    console.log('[TaskChatPopup] DEBUG - Final mentionable users:', {
      taskObject: task,
      taskCreator: task?.creator,
      taskCreatedBy: task?.createdBy,
      taskCreatorId: task?.creatorId,
      taskCreatorUserId: task?.creatorUserId,
      taskCreatorName: task?.creatorName,
      taskCreatedByUser: task?.createdByUser,
      assignedUsers: task?.assignedUserDetails,
      assignedUsersAlt: task?.assignedUsers,
      totalMentionableUsers: usersArray.length,
      users: usersArray,
      currentUserId: currentUserId,
    });
    return usersArray.sort((a, b) => {
      const roleOrder = { creator: 0, assigned: 1, participant: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
  };

  // Handle text input changes and detect mentions
  const handleInputChange = (text) => {
    setInput(text);

    // Find the last @ symbol before or at cursor position
    const textBeforeCursor = text.substring(0, text.length);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) {
      // @ found at valid position (start of text or after space)
      const searchText = textBeforeCursor.substring(atIndex + 1);

      // Check if there's no space after @ (still typing the mention)
      if (!searchText.includes(' ')) {
        setMentionStartIndex(atIndex);
        setMentionSearch(searchText);
        setShowMentions(true);
        return;
      }
    }

    // Hide mentions if no valid @ found
    setShowMentions(false);
    setMentionStartIndex(-1);
    setMentionSearch('');
  };

  // Handle cursor position changes
  const handleSelectionChange = (event) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // Filter users based on mention search
  const getFilteredMentionUsers = () => {
    const mentionableUsers = getMentionableUsers();
    if (!mentionSearch) return mentionableUsers.slice(0, 10); // Show max 10 users

    return mentionableUsers
      .filter((user) => user.name.toLowerCase().includes(mentionSearch.toLowerCase()))
      .slice(0, 10);
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    const beforeMention = input.substring(0, mentionStartIndex);
    const afterMention = input.substring(mentionStartIndex + 1 + mentionSearch.length);

    // Use a more robust mention format that includes the userId
    const mentionText = `@${user.name} `;
    const newText = beforeMention + mentionText + afterMention;

    setInput(newText);

    // Store mapping: mention display text -> userId (more robust mapping)
    const mentionKey = `@${user.name}`;
    setMentionMap((prev) => ({
      ...prev,
      [mentionKey]: user.userId || user.id,
    }));

    setShowMentions(false);
    setMentionStartIndex(-1);
    setMentionSearch('');

    setTimeout(() => {
      const newCursorPosition = beforeMention.length + mentionText.length;
      setCursorPosition(newCursorPosition);
      textInputRef.current?.focus();
    }, 100);
  };

  // Extract mentions from text
  const extractMentions = (text) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    const foundIds = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionString = `@${match[1]}`;

      if (mentionMap[mentionString]) {
        // ✅ Use ID from map if available
        foundIds.push(mentionMap[mentionString]);
      } else {
        // Fallback: match by name from mentionable users
        const mentionedName = match[1].trim();
        const mentionableUsers = getMentionableUsers();
        const user = mentionableUsers.find(
          (u) => u.name.toLowerCase() === mentionedName.toLowerCase()
        );
        if (user) {
          foundIds.push(user.userId || user.id);
        }
      }
    }

    console.log('[TaskChatPopup] Extracted mentions:', {
      text,
      mentionMap,
      foundMentions: foundIds,
      regex: mentionRegex,
    });

    return foundIds;
  };

  // Handle sending message with optimistic UI
  const handleSendMessage = async () => {
    // Only check if there's content, remove sendingMessage blocking
    if (!input.trim() && attachments.length === 0) return;

    const messageText = input.trim();
    const messageAttachments = [...attachments];
    const messageMentions = extractMentions(messageText);

    // Create optimistic message
    const tempMessage = {
      id: generateTempId(),
      text: messageText,
      attachments: messageAttachments,
      mentions: messageMentions,
      userId: currentUserId,
      sender: { name: 'You' },
      createdAt: new Date().toISOString(),
      status: 'sending', // sending, sent, delivered, failed
      isTemp: true,
    };
    
    // Add optimistic message to local state
    setLocalMessages((prev) => [...prev, tempMessage]);
    
    // Clear input and attachments immediately for smooth UX
    setInput('');
    clearAttachments();
    setShowMentions(false);
    setMentionStartIndex(-1);
    setMentionSearch('');
    
    // Scroll to bottom immediately
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Send message in background without blocking UI
    try {
      await onSend(messageText, messageAttachments, messageMentions);
      // Update message status to sent
      setLocalMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? { ...msg, status: 'sent' } : msg))
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update message status to failed
      setLocalMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? { ...msg, status: 'failed' } : msg))
      );
    }
    // No finally block needed since we don't set sendingMessage anymore
  };

  // Format timestamp for display
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const msgDate = new Date(timestamp);
    // Always show time for individual messages
    return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for date separators
  const formatDateSeparator = (timestamp) => {
    if (!timestamp) return '';
    const msgDate = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    
    if (msgDateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (msgDateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Check if we need to show date separator
  const shouldShowDateSeparator = (currentMessage, prevMessage) => {
    if (!prevMessage) return true; // Always show for first message
    
    const currentDate = new Date(currentMessage.createdAt);
    const prevDate = new Date(prevMessage.createdAt);
    
    // Check if dates are different (ignoring time)
    return currentDate.toDateString() !== prevDate.toDateString();
  };

  // Get status icon for message
  const getStatusIcon = (msg) => {
    const status = msg.status;
    // For current user's messages, show read status if available
    if (msg.userId === currentUserId && msg.readBy && Array.isArray(msg.readBy)) {
      const isRead =
        msg.readBy.length > 1 || (msg.readBy.length === 1 && msg.readBy[0] !== currentUserId);
      if (isRead) {
        return <MaterialIcons name="done-all" size={12} color="#4FC3F7" />; // Blue for read
      }
    }

    switch (status) {
      case 'sending':
        return <MaterialIcons name="schedule" size={12} color="rgba(255,255,255,0.7)" />;
      case 'sent':
        return <MaterialIcons name="done" size={12} color="rgba(255,255,255,0.7)" />;
      case 'delivered':
        return <MaterialIcons name="done-all" size={12} color="rgba(255,255,255,0.7)" />;
      case 'failed':
        return <MaterialIcons name="error-outline" size={12} color="#ff6b6b" />;
      default:
        return <MaterialIcons name="done-all" size={12} color="rgba(255,255,255,0.7)" />;
    }
  };

  // Normalize message format from server response
  const normalizeMessage = (msg) => ({
    id: msg.id,
    text: msg.message || msg.text || '',
    attachments: msg.attachments || [],
    userId: msg.senderId || msg.userId,
    sender: msg.sender || { name: 'Unknown' },
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
    readBy: msg.readBy || [],
    mentions: msg.mentions || [],
    status: msg.status || 'delivered', // Server messages are considered delivered
  });

  // Render text with highlighted mentions
  const renderMessageText = (text, isCurrentUser) => {
    if (!text || typeof text !== 'string') {
      return (
        <Text
          style={{
            color: isCurrentUser ? '#fff' : theme.text,
            fontSize: 15,
          }}>
          {text || ''}
        </Text>
      );
    }

    // Updated regex to match both names with spaces and numbers (user IDs): @[Name with spaces or numbers]
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[^\w\s])/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <Text 
            key={`text-${lastIndex}`} 
            style={{ 
              color: isCurrentUser ? '#fff' : theme.text,
              fontSize: 15,
            }}>
            {text.slice(lastIndex, match.index)}
          </Text>
        );
      }

      // Find the correct display name for the mention
      const mentionText = match[1].trim();
      let displayName = mentionText;
      
      // Get mentionable users for lookup
      const mentionableUsers = getMentionableUsers();
      
      // First check if it's a numeric user ID
      if (/^\d+$/.test(mentionText)) {
        // It's a user ID, find the user by ID
        const userById = mentionableUsers.find(user => user.id.toString() === mentionText);
        if (userById) {
          displayName = userById.name;
        } else {
          // User not found in current mentionable users
          displayName = `User ${mentionText}`;
        }
      } else {
        // It's a username, find by exact name match
        const userByName = mentionableUsers.find(user => 
          user.name.toLowerCase() === mentionText.toLowerCase()
        );
        
        if (userByName) {
          displayName = userByName.name;
        } else if (mentionMap[`@${mentionText}`]) {
          // Check mentionMap for mapped usernames
          const mappedUser = mentionableUsers.find(user => user.id === mentionMap[`@${mentionText}`]);
          if (mappedUser) {
            displayName = mappedUser.name;
          }
        }
      }

      // Add highlighted mention with proper display name
      parts.push(
        <Text
          key={`mention-${match.index}`}
          style={{
            color: isCurrentUser ? '#FFE5B4' : theme.primary,
            fontSize: 15,
            fontWeight: '600'
          }}>
          @{displayName}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text 
          key={`text-${lastIndex}`} 
          style={{ 
            color: isCurrentUser ? '#fff' : theme.text,
            fontSize: 15,
          }}>
          {text.slice(lastIndex)}
        </Text>
      );
    }

    return parts.length > 0 ? parts : [
      <Text 
        key="full-text" 
        style={{ 
          color: isCurrentUser ? '#fff' : theme.text,
          fontSize: 15,
        }}>
        {text}
      </Text>
    ];
  };

  // Normalize server messages
  const normalizedServerMessages = Array.isArray(messages) ? messages.map(normalizeMessage) : [];

  // Combine and deduplicate messages
  const allMessages = [
    ...normalizedServerMessages,
    ...(Array.isArray(localMessages) ? localMessages.filter((msg) => {
      // Only show temp messages that haven't been replaced by server messages
      if (msg.isTemp) {
        return !normalizedServerMessages.some(
          (serverMsg) =>
            serverMsg.text === msg.text &&
            serverMsg.userId === msg.userId &&
            Math.abs(new Date(serverMsg.createdAt) - new Date(msg.createdAt)) < 10000
        );
      }
      return false; // Don't include non-temp local messages since they're already in messages array
    }) : []),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Scroll to bottom whenever allMessages changes (for real-time updates)
  useEffect(() => {
    if (visible && Array.isArray(allMessages) && allMessages.length > 0) {
      // Use requestAnimationFrame to ensure the scroll happens after render
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 50);
      });
    }
  }, [allMessages?.length, visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <TouchableWithoutFeedback onPress={showMentions ? closeMentions : undefined}>
          <View style={[styles.popup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MaterialIcons name="chat" size={22} color={theme.primary} />
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                Task Chat
              </Text>
              <TouchableOpacity style={{ marginLeft: 'auto', padding: 6 }} onPress={onClose}>
                <MaterialIcons name="close" size={22} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={{
                flex: 1,
                marginBottom: 12,
                backgroundColor: theme.background,
                padding: 12,
                borderRadius: 12,
              }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              onLayout={() => {
                // Scroll to bottom when layout is complete
                if (visible && Array.isArray(allMessages) && allMessages.length > 0) {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }, 50);
                }
              }}
              onContentSizeChange={() => {
                // Scroll to bottom when content size changes
                if (visible && Array.isArray(allMessages) && allMessages.length > 0) {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }
              }}>
              {loading ? (
                <Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 30 }}>
                  Loading...
                </Text>
              ) : !Array.isArray(allMessages) || allMessages.length === 0 ? (
                <Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 30 }}>
                  No messages yet.
                </Text>
              ) : (
                allMessages.map((msg, idx) => {
                  const prevMsg = idx > 0 ? allMessages[idx - 1] : null;
                  const shouldShowTime = !prevMsg || 
                    (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) > 5 * 60 * 1000; // 5 minutes
                  const showDateSep = shouldShowDateSeparator(msg, prevMsg);
                  
                  return (
                    <View key={idx}>
                      {/* Date separator */}
                      {showDateSep && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginVertical: 16,
                          marginHorizontal: 20,
                        }}>
                          <View style={{
                            flex: 1,
                            height: 1,
                            backgroundColor: theme.border,
                            opacity: 0.3,
                          }} />
                          <Text style={{
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            fontSize: 12,
                            fontWeight: '500',
                            color: theme.secondaryText,
                            backgroundColor: theme.background,
                            borderRadius: 12,
                            textAlign: 'center',
                          }}>
                            {formatDateSeparator(msg.createdAt)}
                          </Text>
                          <View style={{
                            flex: 1,
                            height: 1,
                            backgroundColor: theme.border,
                            opacity: 0.3,
                          }} />
                        </View>
                      )}

                      {/* Message */}
                      <View style={{ marginBottom: 8 }}>
                        <View
                          style={{
                            alignItems: msg.userId === currentUserId ? 'flex-end' : 'flex-start',
                          }}>
                          <View
                            style={{
                              alignSelf: msg.userId === currentUserId ? 'flex-end' : 'flex-start',
                              backgroundColor: msg.userId === currentUserId ? theme.primary : theme.card,
                              borderRadius: 14,
                              borderWidth: 1,
                              borderColor: msg.userId === currentUserId ? theme.border : theme.border,
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              maxWidth: '80%',
                              marginBottom: 2,
                            }}>
                        {/* Sender name (show for all except current user, or always for clarity) */}
                        {msg.sender && msg.sender.name && msg.userId !== currentUserId && (
                          <Text
                            style={{
                              color: theme.secondaryText,
                              fontSize: 12,
                              fontWeight: '400',
                              marginBottom: 2,
                            }}>
                            {msg.sender.name}
                          </Text>
                        )}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onLongPress={() => setShowTimeIdx(idx)}
                          onPressOut={() => setShowTimeIdx(null)}>
                          {/* Message text */}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {renderMessageText(msg.text, msg.userId === currentUserId)}
                          </View>

                          {/* Message status indicator for sent messages */}
                          {msg.userId === currentUserId && msg.status && (
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                marginTop: 4,
                              }}>
                              {msg.status === 'failed' && (
                                <TouchableOpacity
                                  onPress={() => {
                                    // Retry sending message
                                    setInput(msg.text);
                                    if (msg.attachments && msg.attachments.length > 0) {
                                      // Convert server attachment URLs back to file objects for retry
                                      const retryAttachments = msg.attachments.map((att) => {
                                        if (typeof att === 'string') {
                                          return {
                                            uri: att,
                                            name: att.split('/').pop(),
                                            type: 'application/octet-stream',
                                          };
                                        }
                                        return att;
                                      });
                                      setAttachments(retryAttachments);
                                    }
                                    // Clear mentions UI
                                    setShowMentions(false);
                                    setMentionStartIndex(-1);
                                    setMentionSearch('');
                                    setLocalMessages((prev) => prev.filter((m) => m.id !== msg.id));
                                  }}
                                  style={{ marginRight: 4 }}>
                                  <Text style={{ color: '#ff6b6b', fontSize: 11 }}>Tap to retry</Text>
                                </TouchableOpacity>
                              )}
                              {getStatusIcon(msg)}
                            </View>
                          )}
                          {/* Attachments rendering */}
                          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                            <View style={{ marginTop: 6 }}>
                              {msg.attachments.map((att, attIdx) => {
                                // Handle both string URLs and file objects
                                let attachmentUrl, fileName;

                                if (typeof att === 'string') {
                                  attachmentUrl = att;
                                  fileName = att.split('/').pop();
                                } else if (att && att.uri) {
                                  attachmentUrl = att.uri;
                                  fileName = att.name || att.uri.split('/').pop();
                                } else {
                                  return null;
                                }

                                const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                const isPdf = fileName.match(/\.pdf$/i);
                                const isDoc = fileName.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);

                                if (isImage) {
                                  return (
                                    <TouchableOpacity
                                      key={attIdx}
                                      onPress={() =>
                                        setImageModal({ visible: true, uri: attachmentUrl })
                                      }>
                                      <View
                                        style={{
                                          borderRadius: 8,
                                          overflow: 'hidden',
                                          marginTop: 2,
                                          borderWidth: 1,
                                          borderColor: '#eee',
                                          backgroundColor: '#fafbfc',
                                        }}>
                                        <Image
                                          source={{ uri: attachmentUrl }}
                                          style={{ width: 120, height: 90, resizeMode: 'cover' }}
                                        />
                                      </View>
                                    </TouchableOpacity>
                                  );
                                } else {
                                  // File link (pdf, doc, etc)
                                  return (
                                    <TouchableOpacity
                                      key={attIdx}
                                      onPress={() => {
                                        Linking.openURL(attachmentUrl);
                                      }}>
                                      <View
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          marginTop: 2,
                                          backgroundColor: '#f5f5f5',
                                          borderRadius: 6,
                                          paddingVertical: 2,
                                          paddingHorizontal: 6,
                                          borderWidth: 1,
                                          borderColor: '#eee',
                                        }}>
                                        <Feather
                                          name={isPdf ? 'file-text' : isDoc ? 'file' : 'file'}
                                          size={16}
                                          color={theme.primary}
                                        />
                                        <Text
                                          style={{
                                            color: theme.primary,
                                            marginLeft: 4,
                                            textDecorationLine: 'underline',
                                            fontSize: 13,
                                            maxWidth: '90%',
                                          }}
                                          numberOfLines={1}
                                          ellipsizeMode="middle">
                                          {fileName}
                                        </Text>
                                      </View>
                                    </TouchableOpacity>
                                  );
                                }
                              })}
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                      
                      {/* Individual message time */}
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.secondaryText,
                          opacity: 0.7,
                          marginBottom: 4,
                          textAlign: msg.userId === currentUserId ? 'right' : 'left',
                          marginHorizontal: 16,
                        }}>
                        {formatMessageTime(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <Modal
              visible={imageModal.visible}
              transparent
              animationType="fade"
              onRequestClose={() => setImageModal({ visible: false, uri: null })}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <TouchableOpacity
                  style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={1}
                  onPress={() => setImageModal({ visible: false, uri: null })}>
                  <View
                    style={{
                      height: '85%',
                      width: '90%',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    {imageModal.uri && (
                      <Image
                        source={{ uri: imageModal.uri }}
                        style={{ height: '100%', width: '100%', borderRadius: 12 }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </Modal>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.secCard,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginRight: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => setShowAttachOptions(true)}
                disabled={attaching}>
                <Feather name="paperclip" size={18} color={theme.primary} />
                <Text style={{ color: theme.primary, marginLeft: 6 }}>
                  {attaching ? 'Attaching...' : 'Attach'}
                </Text>
              </TouchableOpacity>
              {attachments.length > 0 && (
                <ScrollView horizontal style={{ maxWidth: 180 }}>
                  {attachments.map((file, idx) => {
                    // Determine if file is image by extension
                    const fileName = file.name || file.uri?.split('/').pop() || 'File';
                    const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return (
                      <View
                        key={idx}
                        style={{
                          marginRight: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 8,
                          padding: 4,
                          backgroundColor: theme.card,
                          minWidth: 90,
                          // Responsive shadow for light/dark
                          shadowColor: theme.background,
                          shadowOpacity: theme.colorMode === 'dark' ? 0.25 : 0.08,
                          shadowOffset: { width: 0, height: 1 },
                          shadowRadius: 2,
                          elevation: 2,
                        }}>
                        {isImage && file.uri ? (
                          <Image
                            source={{ uri: file.uri }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              marginRight: 6,
                              backgroundColor: theme.avatarBg || theme.background,
                              borderWidth: 1,
                              borderColor: theme.border,
                            }}
                          />
                        ) : (
                          <Feather
                            name="file"
                            size={18}
                            color={theme.primary}
                            style={{ marginRight: 6 }}
                          />
                        )}
                        <View style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 12,
                              fontWeight: '500',
                            }}
                            numberOfLines={1}
                            ellipsizeMode="middle">
                            {fileName}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveAttachment(idx)}>
                          <MaterialIcons
                            name="close"
                            size={16}
                            color={theme.dangerText || '#E53935'}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {showAttachOptions && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: theme.card,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 20,
                  paddingBottom: 30,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 20,
                  zIndex: 100,
                }}>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '700',
                    fontSize: 18,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>
                  What would you like to attach?
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    marginBottom: 12,
                  }}>
                  {[
                    { type: 'photo', icon: 'image', label: 'Photo' },
                    { type: 'camera', icon: 'camera', label: 'Camera' },
                    { type: 'video', icon: 'video', label: 'Video' },
                    { type: 'document', icon: 'file', label: 'Document' },
                  ].map(({ type, icon, label }) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        setShowAttachOptions(false);
                        pickAttachment(type);
                      }}
                      style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          backgroundColor: theme.card || '#f0f0f0',
                          padding: 14,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 50,
                          marginBottom: 6,
                          shadowColor: '#000',
                          shadowOpacity: 0.06,
                          shadowOffset: { width: 0, height: 1 },
                          shadowRadius: 3,
                          elevation: 4,
                        }}>
                        <Feather name={icon} size={22} color={theme.primary} />
                      </View>
                      <Text style={{ color: theme.text, fontSize: 13 }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => setShowAttachOptions(false)}
                  style={{
                    marginTop: 14,
                    alignSelf: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 18,
                    borderRadius: 8,
                  }}>
                  <Text style={{ color: theme.secondaryText, fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ marginBottom: 2, marginTop: -2 }}>
              <Text style={{ color: theme.secondaryText, fontSize: 13, fontStyle: 'italic' }}>
                Tip: Type @ in your message to mention a user.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {/* Mention instruction tip */}

              <TextInput
                ref={textInputRef}
                style={{
                  flex: 1,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  color: theme.text,
                  fontSize: 15,
                  height: 40,
                }}
                placeholder="Type a message..."
                placeholderTextColor={theme.secondaryText}
                value={input}
                onChangeText={handleInputChange}
                onSelectionChange={handleSelectionChange}
                multiline={false}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={{
                  marginLeft: 8,
                  backgroundColor: theme.primary,
                  borderRadius: 20,
                  padding: 10,
                  opacity: (input.trim() || attachments.length > 0) ? 1 : 0.5,
                }}
                disabled={(!input.trim() && attachments.length === 0)}
                onPress={handleSendMessage}>
                <Feather name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Mention dropdown */}
            {showMentions && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 65,
                  left: 18,
                  right: 18,
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  maxHeight: 200,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 10,
                  zIndex: 1000,
                }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}>
                  <Text
                    style={{
                      color: theme.secondaryText,
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                    Available to mention ({getFilteredMentionUsers().length})
                  </Text>
                </View>
                <ScrollView style={{ maxHeight: 150 }}>
                  {getFilteredMentionUsers().map((user, index) => (
                    <TouchableOpacity
                      key={user.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: index < getFilteredMentionUsers().length - 1 ? 1 : 0,
                        borderBottomColor: theme.border,
                      }}
                      onPress={() => handleMentionSelect(user)}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor:
                            user.role === 'creator'
                              ? '#E91E63'
                              : user.role === 'assigned'
                                ? theme.primary
                                : '#6B7280',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 10,
                        }}>
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: '600',
                          }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 15,
                            fontWeight: '500',
                          }}>
                          {user.name}
                        </Text>
                        {user.role && (
                          <Text
                            style={{
                              color: theme.secondaryText,
                              fontSize: 12,
                              textTransform: 'capitalize',
                            }}>
                            {user.role === 'creator'
                              ? 'Task Creator'
                              : user.role === 'assigned'
                                ? 'Assigned User'
                                : 'Participant'}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons name="alternate-email" size={16} color={theme.secondaryText} />
                    </TouchableOpacity>
                  ))}
                  {getFilteredMentionUsers().length === 0 && (
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 16,
                        alignItems: 'center',
                      }}>
                      <Text
                        style={{
                          color: theme.secondaryText,
                          fontSize: 14,
                        }}>
                        {mentionSearch
                          ? 'No matching users found'
                          : 'No users available to mention'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '92%',
    maxWidth: 420,
    minHeight: 580,
    maxHeight: '90%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
});
