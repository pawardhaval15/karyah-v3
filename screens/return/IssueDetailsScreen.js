import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AttachmentSheet from 'components/popups/AttachmentSheet';
import TaskReassignPopup from 'components/popups/TaskReassignPopup';
import TaskChatPopup from 'components/popups/TaskChatPopup';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import useAudioRecorder from '../components/popups/useAudioRecorder';
import { useTheme } from '../theme/ThemeContext';
import { getUserNameFromToken } from '../utils/auth';
import { fetchTaskMessages, sendTaskMessage } from '../utils/taskMessage';
import {
  deleteIssue,
  fetchIssueById,
  resolveIssueByAssignedUser,
  updateIssue,
} from '../utils/issues';
import { deleteTask, getTaskDetailsById, resolveCriticalOrIssueTask, updateTask } from '../utils/task';

const { width: screenWidth } = Dimensions.get('window');

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString('en-GB');
}

export default function IssueDetailsScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { issueId } = route.params || {};
  
  // Refs
  const tabScrollViewRef = useRef(null);
  // UPDATED SEQUENCE: Info -> Files -> Resolution
  const TABS = ['Info', 'Files', 'Resolution'];

  // State
  const [activeTab, setActiveTab] = useState('Info');
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState(null);
  const [task, setTask] = useState(null);
  const [userName, setUserName] = useState(null);
  
  // Modals & Popups
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showTaskChat, setShowTaskChat] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Data State
  const [remark, setRemark] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Hooks
  const { attachments, pickAttachment, setAttachments } = useAttachmentPicker();
  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audio) => setAttachments((prev) => [...prev, audio]),
  });

  // --- Effects ---
  useEffect(() => {
    getUserNameFromToken().then(setUserName);
  }, []);

  const refreshIssueData = async () => {
    setLoading(true);
    try {
      let data = await getTaskDetailsById(issueId);
      if (data && data.isIssue) {
        setIssue(data);
      } else {
        data = await fetchIssueById(issueId);
        setIssue(data);
      }
    } catch (err) {
      try {
        const data = await fetchIssueById(issueId);
        setIssue(data);
      } catch (e) { setIssue(null); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshIssueData(); }, [issueId]);

  useEffect(() => {
    if (issue && issue.isIssue && issue.taskId) {
      setTask({ ...issue, id: issue.taskId, taskId: issue.taskId, name: issue.taskName });
    } else {
      setTask(null);
    }
  }, [issue]);

  useEffect(() => {
    if (showTaskChat && task) {
      setChatLoading(true);
      fetchTaskMessages(task.taskId || task.id)
        .then(setChatMessages)
        .catch(() => setChatMessages([]))
        .finally(() => setChatLoading(false));
    }
  }, [showTaskChat, task]);

  // --- Handlers ---
  const handleTabPress = (tab) => {
    setActiveTab(tab);
    const index = TABS.indexOf(tab);
    tabScrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    const newTab = TABS[index];
    if (newTab && newTab !== activeTab) setActiveTab(newTab);
  };

  const handleSendChatMessage = async (msg, atts = [], mentions = []) => {
    if (!task) return;
    const newMsg = await sendTaskMessage({ taskId: task.taskId || task.id, message: msg, attachments: atts, mentions });
    setChatMessages(prev => [...prev, newMsg]);
  };

  const handleSubmitResolution = async () => {
    if (!remark.trim() && attachments.length === 0) {
      Alert.alert('Validation', 'Please enter remarks or add attachments.');
      return;
    }
    setLoading(true);
    try {
      const resolvedImages = attachments.map((att, idx) => ({
        uri: Platform.OS === 'android' && !att.uri.startsWith('file://') ? `file://${att.uri}` : att.uri,
        name: att.name || `file_${idx}`,
        type: att.mimeType || 'application/octet-stream',
      }));

      if (issue?.isIssue) {
        await resolveCriticalOrIssueTask(issue.taskId, { remarks: remark.trim(), resolvedImages });
      } else {
        await resolveIssueByAssignedUser({
          issueId,
          remarks: remark,
          resolvedImages,
          issueStatus: 'completed',
        });
      }
      Alert.alert('Success', 'Issue resolved successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper: Get File Icon/Thumbnail ---
  const renderFileThumbnail = (uri, name, type, size = 40) => {
    const fileName = (name || uri || '').toLowerCase();
    const isImage = (type?.includes('image')) || fileName.match(/\.(jpg|jpeg|png|gif|webp|heic)$/);
    const isVideo = (type?.includes('video')) || fileName.match(/\.(mp4|mov|avi|mkv)$/);
    const isAudio = (type?.includes('audio')) || fileName.match(/\.(mp3|wav|m4a|aac)$/);
    const isPDF = fileName.endsWith('.pdf');
    const isWord = fileName.match(/\.(doc|docx)$/);
    const isExcel = fileName.match(/\.(xls|xlsx|csv)$/);
    const isPPT = fileName.match(/\.(ppt|pptx)$/);

    if (isImage) {
      return (
        <Image 
          source={{ uri }} 
          style={{ width: '100%', height: '100%', borderRadius: 8 }} 
          resizeMode="cover" 
        />
      );
    }

    let iconName = 'file-document-outline';
    let iconColor = '#555';
    let bgColor = '#f0f0f0';

    if (isPDF) { iconName = 'file-pdf-box'; iconColor = '#F44336'; bgColor = '#FFEBEE'; }
    else if (isWord) { iconName = 'file-word'; iconColor = '#2196F3'; bgColor = '#E3F2FD'; }
    else if (isExcel) { iconName = 'file-excel'; iconColor = '#4CAF50'; bgColor = '#E8F5E9'; }
    else if (isPPT) { iconName = 'file-powerpoint'; iconColor = '#FF9800'; bgColor = '#FFF3E0'; }
    else if (isVideo) { iconName = 'video'; iconColor = '#E91E63'; bgColor = '#FCE4EC'; }
    else if (isAudio) { iconName = 'music-note'; iconColor = '#9C27B0'; bgColor = '#F3E5F5'; }

    return (
      <View style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: bgColor, 
        borderRadius: 8, 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
      </View>
    );
  };

  // --- Components ---
  const InfoCard = ({ icon, label, value, color }) => (
    <View style={[styles.infoCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>{value || '-'}</Text>
      </View>
    </View>
  );

  const AttachmentItem = ({ att, index, onDelete }) => (
    <View style={[styles.attachmentItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ width: 40, height: 40, marginRight: 12 }}>
         {renderFileThumbnail(att.uri, att.name, att.type, 24)}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{att.name || 'Attachment'}</Text>
        <Text style={{ fontSize: 11, color: theme.secondaryText }}>{att.type || 'File'}</Text>
      </View>
      {onDelete && (
        <TouchableOpacity onPress={() => onDelete(index)} style={{ padding: 4 }}>
          <Feather name="x" size={16} color="#E53935" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !issue) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  if (!issue) return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={{color: theme.text}}>Issue not found</Text></View>;

  const isResolved = issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed';
  const displayTitle = issue.isIssue ? issue.taskName : issue.issueTitle;
  const displayDate = formatDate(issue.isIssue ? issue.endDate : issue.dueDate);
  const displayStatus = issue.status || issue.issueStatus || 'Open';
  
  const originalAttachments = [
    ...(issue.isIssue ? (issue.images || []) : (issue.unresolvedImages || [])),
    ...(issue.resolvedImages || [])
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} bounces={false}>
        
        {/* 1. Header */}
        <LinearGradient colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{t('issue_details')}</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.navButton}>
              <Feather name="more-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={2}>{displayTitle}</Text>
            <View style={styles.headerBadgeRow}>
                <View style={styles.headerBadge}>
                    <Feather name="calendar" size={12} color="#fff" />
                    <Text style={styles.headerBadgeText}>{displayDate}</Text>
                </View>
                <View style={[styles.headerBadge, { backgroundColor: isResolved ? '#4CAF50' : 'rgba(255,255,255,0.2)' }]}>
                    <Text style={styles.headerBadgeText}>{displayStatus}</Text>
                </View>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Floating Actions */}
        <View style={styles.floatingActionContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                <TouchableOpacity onPress={() => setShowTaskChat(true)} style={[styles.actionCircle, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                    <MaterialIcons name="chat" size={22} color="#E91E63" />
                    <Text style={[styles.actionLabel, { color: theme.text }]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setShowReassignModal(true)} 
                    disabled={isResolved}
                    style={[styles.actionCircle, { backgroundColor: theme.card, shadowColor: theme.shadow, opacity: isResolved ? 0.6 : 1 }]}>
                    <MaterialIcons name="person-add" size={22} color={theme.primary} />
                    <Text style={[styles.actionLabel, { color: theme.text }]}>Reassign</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>

        {/* 3. Tabs */}
        <View style={[styles.segmentContainer, { borderColor: theme.border }]}>
           {TABS.map((tab) => (
             <TouchableOpacity 
               key={tab} 
               onPress={() => handleTabPress(tab)}
               style={[styles.segmentButton, activeTab === tab && { borderBottomColor: theme.primary }]}>
               <Text style={[styles.segmentText, { color: activeTab === tab ? theme.primary : theme.secondaryText, fontWeight: activeTab === tab ? '700' : '500' }]}>
                 {t(tab.toLowerCase())}
               </Text>
             </TouchableOpacity>
           ))}
        </View>

        {/* 4. Tab Content (Sequence: Info -> Files -> Resolution) */}
        <ScrollView
            ref={tabScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
        >
            {/* --- SLIDE 1: INFO --- */}
            <View style={styles.tabSlide}>
                <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}><InfoCard icon="briefcase" label={t('project')} value={issue.projectName} color="#2196F3" /></View>
                        <View style={{ flex: 1 }}><InfoCard icon="map-pin" label={t('location')} value={issue.location} color="#9C27B0" /></View>
                    </View>

                    {/* Creator & Assignee */}
                    <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                        <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>People</Text>
                        
                        <View style={styles.peopleRow}>
                            <Image source={{ uri: issue.creator?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={styles.avatarMedium} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ fontSize: 11, color: theme.secondaryText }}>CREATED BY</Text>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{issue.creatorName || issue.creator?.name}</Text>
                            </View>
                        </View>
                        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 12 }} />
                        <View style={styles.peopleRow}>
                             {Array.isArray(issue.assignedUserDetails) && issue.assignedUserDetails.length > 0 ? (
                                <View style={{flexDirection: 'row'}}>
                                    {issue.assignedUserDetails.slice(0,3).map((u, i) => (
                                        <Image key={i} source={{ uri: u.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={[styles.avatarMedium, { marginLeft: i > 0 ? -15 : 0 }]} />
                                    ))}
                                </View>
                             ) : (
                                <Image source={{ uri: issue.assignTo?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={styles.avatarMedium} />
                             )}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ fontSize: 11, color: theme.secondaryText }}>ASSIGNED TO</Text>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
                                    {issue.isIssue && Array.isArray(issue.assignedUserDetails) 
                                        ? issue.assignedUserDetails.map(u => u.name).join(', ') 
                                        : (issue.assignTo?.userName || 'Unassigned')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                        <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>{t('description')}</Text>
                        <Text style={{ color: theme.secondaryText, lineHeight: 22 }}>
                            {issue.description || 'No description provided.'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* --- SLIDE 2: FILES (Moved Here) --- */}
            <View style={styles.tabSlide}>
                {originalAttachments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="file" size={40} color={theme.border} />
                        <Text style={{ color: theme.secondaryText, marginTop: 10 }}>No files attached to this issue.</Text>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {originalAttachments.map((img, i) => {
                            const uri = typeof img === 'string' ? img : img.uri;
                            const name = typeof img === 'string' ? uri.split('/').pop() : img.name;
                            const type = typeof img === 'string' ? '' : img.type;
                            
                            return (
                                <TouchableOpacity 
                                    key={i} 
                                    onPress={() => { setSelectedAttachment({ uri }); setPreviewVisible(true); }}
                                    style={{ width: (screenWidth - 52) / 2, height: 120, borderRadius: 12, backgroundColor: theme.card, elevation: 2, padding: 0 }}>
                                    
                                    {renderFileThumbnail(uri, name, type, 48)}
                                    
                                    <View style={{ 
                                        position: 'absolute', bottom: 0, left: 0, right: 0, 
                                        backgroundColor: 'rgba(0,0,0,0.6)', padding: 6,
                                        borderBottomLeftRadius: 12, borderBottomRightRadius: 12
                                    }}>
                                        <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10 }}>
                                            {name || 'File'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* --- SLIDE 3: RESOLUTION (Moved Here) --- */}
            <View style={styles.tabSlide}>
                {isResolved ? (
                    <View style={{ gap: 16 }}>
                        <View style={[styles.successBanner, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}>
                            <Feather name="check-circle" size={24} color="#4CAF50" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: '#2E7D32' }}>Issue Resolved</Text>
                                <Text style={{ color: '#4CAF50', fontSize: 12 }}>This issue has been marked as completed.</Text>
                            </View>
                        </View>
                        
                        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                            <Text style={[styles.cardTitle, { color: theme.text }]}>Resolution Details</Text>
                            <Text style={{ color: theme.text, marginTop: 8 }}>
                                {issue.remarks || "No remarks provided."}
                            </Text>
                            
                            {issue.resolvedImages?.length > 0 && (
                                <View style={{ marginTop: 16 }}>
                                    <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 8 }}>ATTACHMENTS</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {issue.resolvedImages.map((img, i) => {
                                            const uri = typeof img === 'string' ? img : img.uri;
                                            return (
                                                <TouchableOpacity key={i} onPress={() => { setSelectedAttachment({ uri }); setPreviewVisible(true); }} style={{width: 60, height: 60, marginRight: 8}}>
                                                    {renderFileThumbnail(uri, null, null, 24)}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={{ gap: 16 }}>
                        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>{t('add_resolution')}</Text>
                            
                            <TextInput 
                                style={[styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                                placeholder={t('describe_resolution')}
                                placeholderTextColor={theme.secondaryText}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                value={remark}
                                onChangeText={setRemark}
                            />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                <TouchableOpacity onPress={() => setShowAttachmentSheet(true)} style={[styles.toolButton, { backgroundColor: theme.primary + '15' }]}>
                                    <Feather name="paperclip" size={18} color={theme.primary} />
                                    <Text style={{ color: theme.primary, fontWeight: '600', marginLeft: 6 }}>Attach</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[styles.toolButton, { backgroundColor: isRecording ? '#FFEBEE' : theme.background, borderWidth: 1, borderColor: theme.border }]}>
                                    <Feather name={isRecording ? "stop-circle" : "mic"} size={18} color={isRecording ? "#D32F2F" : theme.secondaryText} />
                                    <Text style={{ color: isRecording ? "#D32F2F" : theme.secondaryText, marginLeft: 6 }}>{isRecording ? `${seconds}s` : 'Audio'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Staged Attachments */}
                            {attachments.length > 0 && (
                                <View style={{ marginTop: 16, gap: 8 }}>
                                    {attachments.map((att, index) => (
                                        <AttachmentItem 
                                            key={index} 
                                            att={att} 
                                            index={index} 
                                            onDelete={(idx) => setAttachments(prev => prev.filter((_, i) => i !== idx))} 
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity onPress={handleSubmitResolution} style={[styles.submitButton, { backgroundColor: theme.primary }]}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{t('submit_resolution')}</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>

      </ScrollView>

      {/* --- POPUPS --- */}
      <TaskChatPopup visible={showTaskChat} onClose={() => setShowTaskChat(false)} messages={chatMessages} onSend={handleSendChatMessage} theme={theme} currentUserId={null} loading={chatLoading} task={task} />
      <TaskReassignPopup visible={showReassignModal} onClose={(updated) => { setShowReassignModal(false); if(updated) navigation.goBack(); }} taskId={task?.taskId || issueId} currentAssignees={issue?.assignedUserDetails || []} theme={theme} />
      <AttachmentSheet visible={showAttachmentSheet} onClose={() => setShowAttachmentSheet(false)} onPick={async (type) => { await pickAttachment(type); setShowAttachmentSheet(false); }} />
      <AttachmentPreviewModal visible={previewVisible} onClose={() => setPreviewVisible(false)} attachment={selectedAttachment} theme={theme} onImagePress={() => setImageModalVisible(true)} />
      <ImageModal visible={imageModalVisible} image={selectedAttachment?.uri} onClose={() => setImageModalVisible(false)} theme={theme} />
      
      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuDropdown, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); /* Add edit logic */ }}>
              <Feather name="edit" size={18} color={theme.text} /><Text style={[styles.menuText, { color: theme.text }]}>{t('edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { 
                setMenuVisible(false); 
                Alert.alert('Delete', 'Delete this issue?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { 
                    try { issue.isIssue ? await deleteTask(issue.taskId) : await deleteIssue(issueId); navigation.goBack(); } catch(e){Alert.alert('Error', e.message)} 
                }}])
            }}>
                <Feather name="trash-2" size={18} color="#f44336" /><Text style={[styles.menuText, { color: "#f44336" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingBottom: 60, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  navTitle: { color: '#fff', fontSize: 16, fontWeight: '500', opacity: 0.9 },
  headerContent: { marginTop: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  headerBadgeRow: { flexDirection: 'row', gap: 10 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  headerBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  floatingActionContainer: { marginTop: -40, marginBottom: 20 },
  actionCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 4, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '500' },

  segmentContainer: { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: 1, paddingBottom: 0 },
  segmentButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  segmentText: { fontSize: 15 },

  tabSlide: { width: screenWidth, padding: 20 },
  
  card: { padding: 20, borderRadius: 16, marginBottom: 12, elevation: 2, shadowOffset: {width:0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, elevation: 1 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoLabel: { fontSize: 11, textTransform: 'uppercase', marginBottom: 2, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600' },

  peopleRow: { flexDirection: 'row', alignItems: 'center' },
  avatarMedium: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', borderWidth: 2, borderColor: '#fff' },

  textArea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, height: 100 },
  toolButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  
  attachmentItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1 },
  fileName: { flex: 1, fontSize: 14, fontWeight: '500', marginLeft: 12 },

  submitButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  successBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  emptyState: { alignItems: 'center', padding: 30 },

  menuDropdown: { position: 'absolute', top: 80, right: 20, borderRadius: 12, padding: 8, elevation: 10, minWidth: 160 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500' }
});