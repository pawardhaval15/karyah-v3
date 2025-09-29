import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import io from 'socket.io-client';
import { useTheme } from '../theme/ThemeContext';
import { getUserIdFromToken } from '../utils/auth';
import { API_URL } from '../utils/config';
import {
  checkUserDiscussionRestrictions,
  getMessagesByProject,
  reactToMessage,
  togglePinMessage
} from '../utils/discussion';

export default function ProjectDiscussionScreen({ route, navigation }) {
  const { projectId, projectName } = route.params;
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userPermissions, setUserPermissions] = useState({
    canView: false,
    canReply: false,
    canEdit: false,
  });
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [selectedPinnedMessage, setSelectedPinnedMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionMap, setMentionMap] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [projectUsers, setProjectUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  // Emoji categories
  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😶', '😐', '😑', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
    'Gestures': ['👍', '👎', '👌', '🤞', '✌️', '🤟', '🤘', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
    'Work': ['💼', '📊', '📈', '📉', '📋', '📌', '📍', '🎯', '✅', '❌', '⚠️', '🔥', '💡', '🚀', '⭐', '🏆']
  };

  // Close mentions dropdown
  const closeMentions = () => {
    setShowMentions(false);
    setMentionStartIndex(-1);
    setMentionSearch('');
  };

  // Get mentionable users from project
  const getMentionableUsers = () => {
    return projectUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }));
  };

  // Handle text input changes and detect mentions
  const handleMessageChange = (text) => {
    setNewMessage(text);
    
    // Check for @ mentions from the current cursor position
    const currentCursor = cursorPosition || text.length;
    const atIndex = text.lastIndexOf('@', currentCursor);
    
    console.log('Text changed:', text, 'Cursor:', currentCursor, 'AtIndex:', atIndex);
    
    if (atIndex !== -1 && (atIndex === 0 || text[atIndex - 1] === ' ')) {
      const afterAt = text.slice(atIndex + 1, currentCursor);
      console.log('After @:', afterAt);
      
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        setMentionStartIndex(atIndex);
        setMentionSearch(afterAt);
        setShowMentions(true);
        console.log('Showing mentions for:', afterAt);
      } else {
        closeMentions();
      }
    } else {
      closeMentions();
    }
  };

  // Handle cursor position changes
  const handleSelectionChange = (event) => {
    const newCursorPos = event.nativeEvent.selection.start;
    console.log('Cursor position changed to:', newCursorPos);
    setCursorPosition(newCursorPos);
    
    // Re-check mentions when cursor moves
    if (newMessage.includes('@')) {
      const atIndex = newMessage.lastIndexOf('@', newCursorPos);
      if (atIndex !== -1 && (atIndex === 0 || newMessage[atIndex - 1] === ' ')) {
        const afterAt = newMessage.slice(atIndex + 1, newCursorPos);
        if (!afterAt.includes(' ') && afterAt.length >= 0) {
          setMentionStartIndex(atIndex);
          setMentionSearch(afterAt);
          setShowMentions(true);
        } else {
          closeMentions();
        }
      } else {
        closeMentions();
      }
    }
  };

  // Filter users based on mention search
  const getFilteredMentionUsers = () => {
    const users = getMentionableUsers();
    console.log('Available mentionable users:', users);
    console.log('Mention search term:', mentionSearch);
    
    if (!mentionSearch) return users;
    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );
    console.log('Filtered users:', filtered);
    return filtered;
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    const beforeMention = newMessage.slice(0, mentionStartIndex);
    const afterMention = newMessage.slice(cursorPosition);
    const mentionText = `@${user.name}`;
    
    const newText = beforeMention + mentionText + ' ' + afterMention;
    setNewMessage(newText);
    
    // Update mention map
    setMentionMap(prev => ({
      ...prev,
      [user.name]: user.id
    }));
    
    closeMentions();
    
    // Focus input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        inputRef.current.focus();
        setCursorPosition(newCursorPos);
      }
    }, 100);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    const beforeCursor = newMessage.slice(0, cursorPosition);
    const afterCursor = newMessage.slice(cursorPosition);
    const newText = beforeCursor + emoji + afterCursor;
    
    setNewMessage(newText);
    setShowEmojiPicker(false);
    
    // Focus input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = cursorPosition + emoji.length;
        inputRef.current.focus();
        setCursorPosition(newCursorPos);
      }
    }, 100);
  };

  // Extract mentions from text
  const extractMentions = (text) => {
    // Updated regex to match both names with spaces and numbers (user IDs): @[Name with spaces or numbers]
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[^\w\s])/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionText = match[1].trim();
      
      // First try to find by name in mentionMap
      let userId = mentionMap[mentionText];
      let userName = mentionText;
      
      // If not found by name, check if it's a user ID or username that matches any project user
      if (!userId) {
        // Check if it's a numeric user ID
        if (/^\d+$/.test(mentionText)) {
          const userById = projectUsers.find(user => user.id.toString() === mentionText);
          if (userById) {
            userId = userById.id;
            userName = userById.name;
          }
        } else {
          // It's a username, find by name
          const userByName = projectUsers.find(user => 
            user.name.toLowerCase() === mentionText.toLowerCase()
          );
          if (userByName) {
            userId = userByName.id;
            userName = userByName.name;
          }
        }
      }
      
      if (userId) {
        mentions.push({
          userId,
          name: userName,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    return mentions;
  };

  useEffect(() => {
    fetchCurrentUser();
    checkUserRestrictions();
    fetchProjectUsers();
    initializeSocket();
    
    // Cleanup socket on unmount
    return () => {
      if (socket) {
        socket.emit('leaveProject', projectId);
        socket.disconnect();
      }
    };
  }, [projectId]);

  // Initialize Socket.IO connection
  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found for socket connection');
        return;
      }

      // Create socket connection with auth
      const socketInstance = io(API_URL.replace('/api/', '').replace('api/', ''), {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance.id);
        setIsConnected(true);
        
        // Join project room for real-time updates
        socketInstance.emit('joinProject', projectId);
        console.log(`Joined project room: ${projectId}`);
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Listen for new messages
      socketInstance.on('newMessage', (message) => {
        console.log('📨 New message received:', message);
        setMessages(prevMessages => {
          // Check if message already exists to avoid duplicates
          const messageExists = prevMessages.some(msg => msg.id === message.id);
          if (messageExists) return prevMessages;
          
          // Add new message to the list
          return [...prevMessages, message];
        });
        
        // Auto scroll to bottom when new message arrives
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      // Listen for message reactions
      socketInstance.on('messageReaction', (data) => {
        console.log('👍 Message reaction received:', data);
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === data.messageId
              ? { ...msg, reactions: data.reactions }
              : msg
          )
        );
      });

      // Listen for message pin/unpin updates
      socketInstance.on('messagePinned', (data) => {
        console.log('📌 Message pin update received:', data);
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === data.messageId
              ? { ...msg, isPinned: data.isPinned, pinned: data.isPinned }
              : msg
          )
        );
      });

      setSocket(socketInstance);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  };

  const fetchProjectUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found for fetching project users');
        return;
      }

      console.log('Fetching project details for projectId:', projectId);
      
      // Get project details which includes owner and co-admins
      const projectResponse = await fetch(`${API_URL}api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!projectResponse.ok) {
        console.error('Failed to fetch project details:', projectResponse.status);
        return;
      }

      const projectData = await projectResponse.json();
      console.log('Project data:', projectData);
      
      const users = [];
      
      // Add project owner/creator
      if (projectData.project) {
        users.push({
          id: projectData.project.creatorId || projectData.project.userId,
          name: projectData.project.creatorName,
          email: projectData.project.creatorEmail,
          role: 'owner'
        });
      }

      // Add co-admins from project data
      if (projectData.project?.coAdmins && Array.isArray(projectData.project.coAdmins)) {
        projectData.project.coAdmins.forEach(coAdmin => {
          // Avoid duplicate owner
          if (coAdmin.userId !== projectData.project.creatorId) {
            users.push({
              id: coAdmin.userId || coAdmin.id,
              name: coAdmin.name,
              email: coAdmin.email,
              role: 'co-admin'
            });
          }
        });
      }

      console.log('Final users list:', users);
      console.log('User IDs in project:', users.map(u => ({ id: u.id, name: u.name })));
      setProjectUsers(users);
    } catch (error) {
      console.error('Error fetching project users:', error);
    }
  };

  useEffect(() => {
    if (userPermissions.canView) {
      fetchMessages();
    }
  }, [userPermissions.canView]);

  const fetchCurrentUser = async () => {
    try {
      const userId = await getUserIdFromToken();
      setCurrentUserId(userId);
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
  };

  const checkUserRestrictions = async () => {
    try {
      setPermissionsLoading(true);
      const permissions = await checkUserDiscussionRestrictions(projectId);
      
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Failed to check user restrictions:', error);
      // On error, default to no access for security
      setUserPermissions({
        canView: false,
        canReply: false,
        canEdit: false,
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getMessagesByProject(projectId);
      // Normalize reactions for each message
      const normalizedMessages = Array.isArray(data)
        ? data.map((msg) => ({
            ...msg,
            reactions:
              msg.reactions && typeof msg.reactions === 'object'
                ? Object.entries(msg.reactions).map(([userId, reaction]) => ({
                    userId,
                    type: reaction,
                    count: 1,
                  }))
                : [],
          }))
        : [];
      setMessages(normalizedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (error.message.includes('Access restricted')) {
        // Handle restriction-based access denial
        setUserPermissions({
          canView: false,
          canReply: false,
          canEdit: false,
        });
      }
      // Don't show alert for restriction errors as they're handled in UI
    } finally {
      setLoading(false);
    }
  };

    const handleSendMessage = async () => {
    console.log('Send message called. Message:', newMessage.trim(), 'Sending:', sending, 'CanReply:', userPermissions.canReply);
    
    if (!newMessage.trim() || sending || !userPermissions.canReply) return;

    try {
      setSending(true);
      const token = await AsyncStorage.getItem('token');
      console.log('Token retrieved:', !!token);
      
      // Extract mentions from the message
      const mentions = extractMentions(newMessage);
      console.log('Extracted mentions:', mentions);
      
      const messageData = {
        content: newMessage.trim(),
        senderId: currentUserId,
        projectId,
        replyToId: replyingTo?.id || null,
        mentions: mentions.map(mention => ({
          userId: mention.userId,
          name: mention.name
        }))
      };

      console.log('Sending message data:', messageData);
      console.log('API URL:', `${API_URL}api/discussions/${projectId}`);

      const response = await fetch(`${API_URL}api/discussions/${projectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        const messageResponse = JSON.parse(responseText);
        console.log('Message sent successfully:', messageResponse);
        
        // Emit socket event for real-time updates to other users
        if (socket && isConnected) {
          socket.emit('sendMessage', {
            projectId,
            message: messageResponse.message || messageResponse,
            senderId: currentUserId
          });
        }
        
        setNewMessage('');
        setReplyingTo(null);
        setMentionMap({});
        closeMentions();
        
        // Add message to local state immediately for better UX
        if (messageResponse.message || messageResponse) {
          const newMsg = messageResponse.message || messageResponse;
          setMessages(prevMessages => [...prevMessages, newMsg]);
        } else {
          // Fallback: fetch messages if response structure is different
          await fetchMessages();
        }
        
        // Scroll to bottom after sending
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error(`Failed to send message: ${response.status} - ${responseText}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleReaction = async (messageId, reactionType) => {
    try {
      const reactionData = {
        reaction: reactionType,
        userId: currentUserId,
      };
      const response = await reactToMessage(messageId, reactionData);

      // Emit socket event for real-time reaction updates
      if (socket && isConnected) {
        socket.emit('messageReaction', {
          projectId,
          messageId,
          reactions: response.reactions,
          userId: currentUserId
        });
      }

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
      if (error.message.includes('access restricted')) {
        Alert.alert('Access Restricted', 'You do not have permission to react to messages in this discussion.');
      } else {
        Alert.alert('Error', 'Failed to add reaction. Please try again.');
      }
    }
  };

  const handleTogglePin = async (messageId) => {
    if (!userPermissions.canEdit) {
      Alert.alert('Access Restricted', 'You do not have permission to pin messages');
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

      // Emit socket event for real-time pin updates
      if (socket && isConnected) {
        socket.emit('messagePinned', {
          projectId,
          messageId,
          isPinned: response.pinned || newPinStatus,
          userId: currentUserId
        });
      }

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
      if (error.message && error.message.includes('Only the project creator can pin/unpin messages')) {
        Alert.alert('No Access', 'You do not have access to pin/unpin messages. Only the project owner can perform this action.');
      } else if (error.message && error.message.includes('access restricted')) {
        Alert.alert('Access Restricted', 'You do not have permission to pin messages');
      } else {
        Alert.alert('Error', 'Failed to toggle pin status. Please try again.');
      }
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for date separators
  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    }
  };

  // Check if we need to show date separator
  const shouldShowDateSeparator = (currentMessage, prevMessage) => {
    if (!prevMessage) return true; // Always show for first message
    
    const currentDate = new Date(currentMessage.createdAt);
    const prevDate = new Date(prevMessage.createdAt);
    
    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const prevDay = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
    
    return currentDay.getTime() !== prevDay.getTime();
  };

  // Render message text with highlighted mentions
  const renderMessageText = (text, isOwnMessage) => {
    // Updated regex to match both names with spaces and numbers (user IDs): @[Name with spaces or numbers]
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[^\w\s])/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={{ color: isOwnMessage ? '#fff' : theme.text }}>
            {text.slice(lastIndex, match.index)}
          </Text>
        );
      }

      // Find the correct display name for the mention
      const mentionText = match[1].trim();
      let displayName = mentionText;
      
      // First check if it's a numeric user ID
      if (/^\d+$/.test(mentionText)) {
        // It's a user ID, find the user by ID
        const userById = projectUsers.find(user => user.id.toString() === mentionText);
        if (userById) {
          displayName = userById.name;
        } else {
          // User not found in current project users (might have been removed)
          // Show "User" instead of the raw ID for better UX
          displayName = `User ${mentionText}`;
        }
      } else {
        // It's a username, find by exact name match
        const userByName = projectUsers.find(user => 
          user.name.toLowerCase() === mentionText.toLowerCase()
        );
        
        if (userByName) {
          displayName = userByName.name;
        } else if (mentionMap[mentionText]) {
          // Check mentionMap for mapped usernames
          const mappedUser = projectUsers.find(user => user.id === mentionMap[mentionText]);
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
            color: isOwnMessage ? '#FFE5B4' : theme.primary,
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
        <Text key={`text-${lastIndex}`} style={{ color: isOwnMessage ? '#fff' : theme.text }}>
          {text.slice(lastIndex)}
        </Text>
      );
    }

    return parts.length > 0 ? parts : [
      <Text key="full-text" style={{ color: isOwnMessage ? '#fff' : theme.text }}>
        {text}
      </Text>
    ];
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.senderId === currentUserId;
    const isPinned = message.isPinned || message.pinned;
    const isSelected = selectedPinnedMessage === message.id;

    // Check if this is a consecutive message from the same sender
    const prevMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

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

    // Find parent message for reply indicator
    let parentMessageContent = '';
    if (message.replyToId) {
      const parentMsg = messages.find((m) => m.id === message.replyToId);
      parentMessageContent = parentMsg ? parentMsg.content : 'Message';
    }

    return (
      <View
        key={message.id}
        style={[styles.messageContainer, {
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          marginBottom: isLastInGroup ? 16 : 3,
          marginTop: isFirstInGroup ? 8 : 0,
        }]}
      >
        <View
          style={[styles.messageBubble, {
            backgroundColor: isOwnMessage ? '#17313E' : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : 1,
            alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            shadowColor: isSelected ? theme.primary : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isSelected ? 0.3 : 0,
            shadowRadius: isSelected ? 4 : 0,
            elevation: isSelected ? 3 : 1,
            // WhatsApp-like bubble shaping
            borderTopLeftRadius: isOwnMessage ? 16 : isFirstInGroup ? 16 : 4,
            borderTopRightRadius: isOwnMessage ? (isFirstInGroup ? 16 : 4) : 16,
            borderBottomLeftRadius: isOwnMessage ? 16 : isLastInGroup ? 16 : 4,
            borderBottomRightRadius: isOwnMessage ? (isLastInGroup ? 16 : 4) : 16,
          }]}
        >
          {/* Show sender name only for first message in group from others */}
          {!isOwnMessage && isFirstInGroup && (
            <View style={styles.messageHeader}>
              <Text style={[styles.senderName, { color: theme.primary }]}> {message.User?.name || message.sender?.name || 'Unknown User'} </Text>
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

          {/* Show reply indicator if this message is a reply */}
          {message.replyToId && (
            <View style={styles.replyIndicator}>
              <View style={[styles.replyLine, { backgroundColor: theme.primary }]} />
              <Text style={[styles.replyText, { color: theme.secondaryText }]} numberOfLines={1}>
                Replying to: {parentMessageContent}
              </Text>
            </View>
          )}

          <Text style={[styles.messageText, { color: isOwnMessage ? '#fff' : theme.text }]}> 
            {renderMessageText(message.content, isOwnMessage)}
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
                onPress={() => handleReply(message)}
                style={styles.actionButton}>
                <MaterialIcons
                  name="reply"
                  size={14}
                  color={isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.secondaryText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReaction(message.id, 'like')}
                style={styles.actionButton}>
                <MaterialIcons
                  name="thumb-up"
                  size={14}
                  color={isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.secondaryText}
                />
              </TouchableOpacity>

              {userPermissions.canEdit && (
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

  // Separate pinned messages for the sticky header - show latest first
  const pinnedMessages = messages
    .filter((msg) => msg.isPinned || msg.pinned)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}> 
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} /> 
        </TouchableOpacity>
        <View style={styles.headerContent}> 
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Discussion</Text>
            {/* Connection Status Indicator */}
            <View style={[
              styles.connectionIndicator,
              { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
            ]} />
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
            {projectName} {isConnected ? '• Live' : '• Offline'}
          </Text> 
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.headerAction} onPress={handleRefresh}>
            <MaterialIcons name="refresh" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialIcons name="info-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
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
                      backgroundColor: theme.card,
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
                    // Scroll to the message in the main chat
                    const messageIndex = messages.findIndex((msg) => msg.id === message.id);
                    if (messageIndex !== -1) {
                      scrollViewRef.current?.scrollTo({ y: messageIndex * 80, animated: true });
                    }
                  }}>
                  <Text style={[styles.compactPinnedText, { color: theme.text }]} numberOfLines={1}>
                    {senderName}: {message.content}
                  </Text>
                  {userPermissions.canEdit && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleTogglePin(message.id);
                      }}
                      style={[
                        styles.compactUnpinButton,
                        { backgroundColor: isSelected ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)' },
                      ]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={isSelected ? '#fff' : theme.text}
                      />
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            // Scroll to bottom to see latest messages
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {permissionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                Checking discussion restrictions...
              </Text>
            </View>
          ) : !userPermissions.canView ? (
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
                {userPermissions.canReply
                  ? 'Be the first to share your thoughts about this project'
                  : 'No messages yet. You can view messages but cannot post replies.'}
              </Text>
            </View>
          ) : (
            // Show all messages in chronological order with date separators
            messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
              
              return (
                <React.Fragment key={`message-group-${index}-${message.id}`}>
                  {showDateSeparator && (
                    <View style={styles.dateSeparatorContainer}>
                      <View style={[styles.dateSeparator, { backgroundColor: theme.border }]} />
                      <Text style={[styles.dateSeparatorText, { 
                        backgroundColor: theme.background, 
                        color: theme.secondaryText 
                      }]}>
                        {formatDateSeparator(message.createdAt)}
                      </Text>
                      <View style={[styles.dateSeparator, { backgroundColor: theme.border }]} />
                    </View>
                  )}
                  {renderMessage(message, index)}
                </React.Fragment>
              );
            })
          )}
        </ScrollView>

        {/* Input - Only show if user can reply and has view access */}
        {userPermissions.canView && (
          <>
            {/* Reply Preview - Outside of input container for better positioning */}
            {replyingTo && (
              <View style={[styles.replyPreviewContainer, { backgroundColor: theme.card }]}> 
                <View style={[styles.replyPreview, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                  <View style={styles.replyPreviewContent}> 
                    <MaterialIcons name="reply" size={16} color={theme.primary} /> 
                    <View style={styles.replyPreviewText}> 
                      <Text style={[styles.replyPreviewTitle, { color: theme.primary }]}> 
                        Replying to {replyingTo.User?.name || replyingTo.sender?.name || 'Unknown'} 
                      </Text> 
                      <Text style={[styles.replyPreviewMessage, { color: theme.secondaryText }]} numberOfLines={1}> 
                        {replyingTo.content} 
                      </Text> 
                    </View> 
                  </View> 
                  <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}> 
                    <MaterialIcons name="close" size={18} color={theme.secondaryText} /> 
                  </TouchableOpacity> 
                </View> 
              </View>
            )}

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.card, borderTopColor: theme.border },
              ]}>
              {userPermissions.canReply ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', flex: 1 }}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                        flex: 1,
                      },
                    ]}
                    placeholder={replyingTo ? `Reply to ${replyingTo.User?.name || 'message'}...` : "Type your message... (@ to mention)"}
                    placeholderTextColor={theme.secondaryText}
                    value={newMessage}
                    onChangeText={handleMessageChange}
                    onSelectionChange={handleSelectionChange}
                    multiline
                    maxLength={1000}
                    onSubmitEditing={() => {
                      if (!newMessage.includes('\n')) {
                        handleSendMessage();
                      }
                    }}
                    blurOnSubmit={!newMessage.includes('\n')}
                    returnKeyType="send"
                  />
                </View>
                
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

            {/* Mention Dropdown */}
            {showMentions && (
              <View style={[
                styles.mentionDropdown, 
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}>
                {getFilteredMentionUsers().length > 0 ? (
                  <>
                    <Text style={[styles.mentionHeader, { color: theme.text }]}>
                      Available to mention ({getFilteredMentionUsers().length})
                    </Text>
                    <FlatList
                      data={getFilteredMentionUsers()}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.mentionItem, { borderBottomColor: theme.border }]}
                          onPress={() => handleMentionSelect(item)}>
                          <View style={styles.mentionUserInfo}>
                            <View style={[
                              styles.mentionAvatar,
                              { backgroundColor: item.role === 'owner' ? '#FF6B6B' : item.role === 'co-admin' ? '#FFA726' : '#4ECDC4' }
                            ]}>
                              <Text style={styles.mentionAvatarText}>
                                {item.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.mentionTextContainer}>
                              <Text style={[styles.mentionName, { color: theme.text }]}>
                                {item.name}
                              </Text>
                              <Text style={[styles.mentionRole, { color: theme.secondaryText }]}>
                                {item.role === 'owner' ? 'Project Owner' : item.role === 'co-admin' ? 'Co-Admin' : 'Collaborator'}
                              </Text>
                            </View>
                            <Text style={[styles.mentionSymbol, { color: theme.secondaryText }]}>
                              @
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </>
                ) : (
                  <Text style={[styles.noMentionsText, { color: theme.secondaryText }]}>
                    No users found
                  </Text>
                )}
              </View>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <View style={[
                styles.emojiPickerContainer,
                { backgroundColor: theme.card, borderColor: theme.border }
              ]}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {Object.entries(emojiCategories).map(([category, emojis]) => (
                    <View key={category} style={{ marginBottom: 10 }}>
                      <Text style={[styles.emojiCategoryTitle, { color: theme.text }]}>
                        {category}
                      </Text>
                      <View style={styles.emojiGrid}>
                        {emojis.map((emoji, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.emojiButton}
                            onPress={() => handleEmojiSelect(emoji)}>
                            <Text style={styles.emoji}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          </>
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
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
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
    paddingBottom: 20,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  dateSeparator: {
    flex: 1,
    height: 1,
  },
  dateSeparatorText: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    borderRadius: 12,
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
    maxWidth: '100%',
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
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingLeft: 8,
  },
  replyLine: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  replyPreviewContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderLeftWidth: 1.5,
    borderLeftColor: '#007AFF',
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyPreviewText: {
    flex: 1,
    marginLeft: 8,
  },
  replyPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyPreviewMessage: {
    fontSize: 12,
  },
  cancelReplyButton: {
    padding: 4,
    marginLeft: 8,
  },
  stickyPinnedSection: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 80,
  },
  pinnedMessagesScroll: {
    marginTop: 6,
  },
  compactPinnedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    borderWidth: 1,
    maxWidth: 250,
    minHeight: 32,
    minWidth: 80,
  },
  compactPinnedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  compactUnpinButton: {
    marginLeft: 6,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: 28,
    width: 28,
    borderRadius: 14,
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
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
  mentionDropdown: {
    position: 'absolute',
    bottom: 65,
    left: 12,
    right: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingVertical: 8,
  },
  mentionHeader: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mentionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  mentionUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mentionAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mentionTextContainer: {
    flex: 1,
  },
  mentionName: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 18,
  },
  mentionRole: {
    fontSize: 12,
    marginTop: 2,
  },
  mentionSymbol: {
    fontSize: 18,
    fontWeight: '600',
  },
  noMentionsText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
    fontStyle: 'italic',
  },
  emojiPickerContainer: {
    position: 'absolute',
    bottom: 65,
    left: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emojiCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 24,
  },
});
