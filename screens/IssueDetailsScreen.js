import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ReassignPopup from 'components/popups/AssignUserPopup';
import AttachmentSheet from 'components/popups/AttachmentSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView, StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import useAudioRecorder from '../components/popups/useAudioRecorder';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { approveIssue, deleteIssue, fetchIssueById, resolveIssueByAssignedUser, updateIssue } from '../utils/issues';
import { getUserNameFromToken } from '../utils/auth'; // import this
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-GB');
}
export default function IssueDetailsScreen({ navigation, route }) {
    const theme = useTheme();
    const { issueId, section } = route.params || {};
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [userName, setUserName] = useState(null);
    const [editFields, setEditFields] = useState({
        issueTitle: '',
        description: '',
        dueDate: '',
    });
    // Add menuVisible state for three-dots menu
    const [menuVisible, setMenuVisible] = useState(false);
    // Attachment state
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [remark, setRemark] = useState('');
    const [drawerAttachments, setDrawerAttachments] = useState([]);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const { attachments, pickAttachment, setAttachments } = useAttachmentPicker();
    const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
    useEffect(() => {
        getUserNameFromToken().then(setUserName);
    }, []);
    const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
        onRecordingFinished: (audio) => {
            setAttachments(prev => [...prev, audio]);
        }
    });
    const userImg = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
    useEffect(() => {
        if (!issueId) return;
        setLoading(true);
        fetchIssueById(issueId)
            .then((data) => {
                setIssue(data);
                setEditFields({
                    issueTitle: data.issueTitle || '',
                    description: data.description || '',
                    dueDate: data.dueDate || '',
                });
            })
            .catch(() => setIssue(null))
            .finally(() => setLoading(false));
    }, [issueId]);

    const handleSubmit = async () => {
        if (!remark.trim() && attachments.length === 0) {
            Alert.alert('Please enter remarks or add attachments.');
            return;
        }
        setLoading(true);
        try {
            const resolvedImages = attachments.map(att => ({
                uri: att.uri,
                name: att.name || att.uri?.split('/').pop(),
                type: att.mimeType || att.type || 'application/octet-stream',
            }));
            await resolveIssueByAssignedUser({
                issueId,
                remarks: remark,
                resolvedImages,
                issueStatus: 'resolved',
            });
            Alert.alert('Submitted successfully');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to submit resolution');
        } finally {
            setLoading(false);
        }
    };
    // Merge all attachments for drawer
    const allAttachments = [
        ...(issue?.unresolvedImages || []),
        ...(issue?.resolvedImages || []),
        ...(section === 'assigned' ? attachments : []),
    ];
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }
    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 70 : 25, marginLeft: 16, marginBottom: 18, justifyContent: 'space-between' }}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => navigation.goBack()}>
                        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
                        <Text style={{ fontSize: 18, color: theme.text, fontWeight: '400', marginLeft: 2 }}>Back</Text>
                    </TouchableOpacity>
                    {userName && issue?.creatorName === userName ? (
                        isEditing ? (
                            <TouchableOpacity
                                onPress={async () => {
                                    // Validate at least one field is filled
                                    if (!editFields.issueTitle.trim() && !editFields.description.trim() && !editFields.dueDate) {
                                        Alert.alert('Error', 'Please fill at least one field to update the issue.');
                                        return;
                                    }
                                    try {
                                        setLoading(true);
                                        // Prepare update payload, separating new files and existing URLs
                                        let assignedUserId = '';
                                        if (issue.assignTo) {
                                            // If assignTo is an object, get userId or id property
                                            if (typeof issue.assignTo === 'object' && (issue.assignTo.userId || issue.assignTo.id)) {
                                                assignedUserId = String(issue.assignTo.userId || issue.assignTo.id);
                                            } else if (typeof issue.assignTo === 'number' || /^\d+$/.test(issue.assignTo)) {
                                                assignedUserId = String(issue.assignTo);
                                            }
                                        }
                                        // Only send assignTo if it's a valid integer string
                                        let updatePayload = {
                                            issueId: issue.issueId,
                                            issueTitle: editFields.issueTitle.trim() || undefined,
                                            description: editFields.description.trim() || undefined,
                                            dueDate: editFields.dueDate || undefined,
                                            ...(assignedUserId ? { assignTo: assignedUserId } : {}),
                                            // You can add assignTo, isCritical, issueStatus, remarks, removeImages, removeResolvedImages if needed
                                        };
                                        // Separate existing URLs and new files
                                        let existingUnresolvedImages = [];
                                        let newUnresolvedImages = [];
                                        if (Array.isArray(issue.unresolvedImages)) {
                                            existingUnresolvedImages = issue.unresolvedImages.filter(img =>
                                                typeof img === 'string' && !img.startsWith('file://')
                                            );
                                        }
                                        if (attachments && attachments.length > 0) {
                                            newUnresolvedImages = attachments.filter(att =>
                                                att.uri && att.uri.startsWith('file://')
                                            ).map((att, idx) => ({
                                                uri: att.uri,
                                                name: att.name || att.uri?.split('/').pop() || `file_${idx}`,
                                                type: att.mimeType || att.type || 'application/octet-stream',
                                            }));
                                        }
                                        // Only send new files as unresolvedImages (for FormData)
                                        if (newUnresolvedImages.length > 0) {
                                            updatePayload.unresolvedImages = newUnresolvedImages;
                                        }
                                        // Optionally, send existing URLs in a separate field if backend supports it
                                        if (existingUnresolvedImages.length > 0) {
                                            updatePayload.existingUnresolvedImages = existingUnresolvedImages;
                                        }
                                        await updateIssue(updatePayload);
                                        Alert.alert('Success', 'Issue updated successfully.');
                                        const updated = await fetchIssueById(issue.issueId);
                                        setIssue(updated);
                                        setIsEditing(false);
                                        // Signal IssuesScreen to refresh
                                        navigation.navigate('IssuesScreen', { refresh: true });
                                    } catch (err) {
                                        let errorMsg = 'Failed to update issue';
                                        if (err && (typeof err === 'string' || typeof err?.message === 'string')) {
                                            errorMsg = err.message || err;
                                        }
                                        Alert.alert('Error', errorMsg);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                style={{ paddingVertical: 8, paddingHorizontal: 18, backgroundColor: theme.primary, borderRadius: 8, marginRight: 20 }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}>Save</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8, marginRight: 8 }}>
                                <Feather name="more-vertical" size={22} color={theme.text} />
                            </TouchableOpacity>
                        )
                    ) : null}
                </View>
                {(() => {
                    return (
                        userName && issue?.creatorName === userName && (
                            <Modal
                                visible={menuVisible}
                                transparent
                                animationType="fade"
                                onRequestClose={() => setMenuVisible(false)}
                            >
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
                                    activeOpacity={1}
                                    onPress={() => setMenuVisible(false)}
                                >
                                    <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 80 : 35, right: 20, backgroundColor: theme.card, borderRadius: 10, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 6, elevation: 6, minWidth: 140 }}>
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
                                            onPress={() => {
                                                setMenuVisible(false);
                                                setIsEditing(true);
                                            }}
                                        >
                                            <Feather name="edit" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                                            <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 15 }}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}
                                            onPress={async () => {
                                                setMenuVisible(false);
                                                // Confirm delete
                                                Alert.alert(
                                                    'Delete Issue',
                                                    'Are you sure you want to delete this issue?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete', style: 'destructive', onPress: async () => {
                                                                try {
                                                                    await deleteIssue(issue.issueId);
                                                                    // Signal IssuesScreen to refresh
                                                                    navigation.navigate('IssuesScreen', { refresh: true });
                                                                } catch (err) {
                                                                    Alert.alert('Delete Failed', err.message || 'Could not delete issue.');
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Feather name="trash-2" size={18} color="#E53935" style={{ marginRight: 8 }} />
                                            <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        )
                    );
                })()}
                <LinearGradient
                    colors={['#011F53', '#366CD9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                        borderRadius: 16,
                        marginHorizontal: 16,
                        marginBottom: 12,
                        padding: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        minHeight: 110,
                    }}
                >
                    <View>
                        {isEditing ? (
                            <TextInput
                                style={{ color: '#fff', fontSize: 22, fontWeight: '600', padding: 0, margin: 0 }}
                                value={editFields.issueTitle}
                                onChangeText={text => setEditFields(f => ({ ...f, issueTitle: text }))}
                                placeholder="Issue Title"
                                placeholderTextColor="#e6eaf3"
                            />
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>{issue.issueTitle}</Text>
                        )}
                        <Text style={styles.bannerDesc}>All issues details are listed here.</Text>
                    </View>
                </LinearGradient>
                <FieldBox
                    label="Project Name"
                    value={issue.projectName || ''}
                    placeholder="Project Name"
                    theme={theme}
                    editable={false}
                />
                <FieldBox
                    label="Location"
                    value={issue.projectLocation || ''}
                    placeholder="Location"
                    theme={theme}
                    editable={false}
                />
                <FieldBox
                    label="Description"
                    value={isEditing ? editFields.description : issue.description}
                    placeholder="Description"
                    multiline
                    theme={theme}
                    editable={isEditing}
                    onChangeText={text => isEditing && setEditFields(f => ({ ...f, description: text }))}
                />
                {/* Attachments Field - Edit Mode */}
                {isEditing ? (
                    <View style={{ marginBottom: 0 }}>
                        <FieldBox
                            label="Added Attachments"
                            value=""
                            placeholder="Added Attachments"
                            rightComponent={
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 0,
                                            paddingHorizontal: 6,
                                            backgroundColor: theme.secCard,
                                            borderRadius: 8,
                                            justifyContent: 'center',
                                            alignSelf: 'center',
                                        }}
                                        onPress={() => setShowAttachmentSheet(true)}
                                    >
                                        <Feather name="paperclip" size={18} color={theme.primary} />
                                        <Text style={{ color: theme.primary, fontWeight: '500' }}> Add</Text>
                                    </TouchableOpacity>
                                    {(attachments.length > 0 || (issue?.unresolvedImages && issue.unresolvedImages.length > 0)) && (
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: 0,
                                                paddingHorizontal: 6,
                                                backgroundColor: theme.secCard,
                                                borderRadius: 8,
                                                justifyContent: 'center',
                                                alignSelf: 'center',
                                            }}
                                            onPress={() => {
                                                setDrawerVisible(true);
                                                setDrawerAttachments(issue.unresolvedImages || []);
                                            }}
                                        >
                                            <MaterialIcons name="folder" size={18} color={theme.primary} />
                                            <Text style={{ color: theme.primary, fontWeight: '500' }}> Open</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            }
                            theme={theme}
                            containerStyle={{ alignItems: 'center' }}
                        />
                        {/* Show picked attachments in edit mode */}
                        {attachments.length > 0 && (
                            <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                                {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
                                    <View key={rowIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, }}>
                                        {[0, 1].map(colIdx => {
                                            const idx = rowIdx * 2 + colIdx;
                                            const att = attachments[idx];
                                            if (!att) return <View key={colIdx} style={{ flex: 1 }} />;
                                            return (
                                                <View
                                                    key={att.uri || att.name || idx}
                                                    style={{
                                                        flex: 1,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        padding: 8,
                                                        borderWidth: 1,
                                                        borderColor: theme.border,
                                                        borderRadius: 10,
                                                        backgroundColor: theme.card,
                                                        marginRight: colIdx === 0 ? 12 : 0
                                                    }}
                                                >
                                                    {/* Preview for images */}
                                                    {att.type && att.type.startsWith('image') ? (
                                                        <TouchableOpacity onPress={() => { /* Optionally open image in modal */ }}>
                                                            <Image
                                                                source={{ uri: att.uri }}
                                                                style={{ width: 25, height: 25, borderRadius: 6, marginRight: 8 }}
                                                            />
                                                        </TouchableOpacity>
                                                    ) : null}
                                                    {/* Preview for audio */}
                                                    {att.type && att.type.startsWith('audio') ? (
                                                        <TouchableOpacity
                                                            onPress={async () => {
                                                                const { Sound } = await import('expo-av');
                                                                const { sound } = await Sound.createAsync({ uri: att.uri });
                                                                await sound.playAsync();
                                                            }}
                                                            style={{ marginRight: 8 }}
                                                        >
                                                            <MaterialCommunityIcons name="play-circle-outline" size={28} color="#1D4ED8" />
                                                        </TouchableOpacity>
                                                    ) : null}
                                                    {/* File/document icon for other types */}
                                                    {!att.type?.startsWith('image') && !att.type?.startsWith('audio') ? (
                                                        <MaterialCommunityIcons name="file-document-outline" size={28} color="#888" style={{ marginRight: 8 }} />
                                                    ) : null}
                                                    {/* File name */}
                                                    <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                                                        {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 20
                                                            ? (att.name || att.uri?.split('/').pop()).slice(0, 15) + '...'
                                                            : (att.name || att.uri?.split('/').pop())}
                                                    </Text>
                                                    {/* Remove button */}
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setAttachments(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        <MaterialCommunityIcons name="close-circle" size={22} color="#E53935" />
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        )}
                        <AttachmentSheet
                            visible={showAttachmentSheet}
                            onClose={() => setShowAttachmentSheet(false)}
                            onPick={async (type) => {
                                await pickAttachment(type);
                                setShowAttachmentSheet(false);
                            }}
                        />
                    </View>
                ) : (
                    <FieldBox
                        label="Added Attachments"
                        value=""
                        placeholder="Added Attachments"
                        rightComponent={
                            allAttachments.length > 0 && (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 0,
                                        paddingHorizontal: 6,
                                        borderRadius: 8,
                                        justifyContent: 'center',
                                        alignSelf: 'center',
                                    }}
                                    onPress={() => {
                                        setDrawerVisible(true);
                                        setDrawerAttachments(issue.unresolvedImages || []);
                                    }}
                                >
                                    <MaterialIcons name="folder" size={18} color={theme.primary} />
                                    <Text style={{ color: theme.primary, fontWeight: '500' }}> Open</Text>
                                </TouchableOpacity>
                            )
                        }
                        theme={theme}
                        containerStyle={{ alignItems: 'center' }}
                    />
                )}
                <FieldBox
                    label="Assigned To"
                    value={issue.assignTo?.userName || ''}
                    placeholder="Assigned To"
                    rightComponent={
                        <Image
                            source={{ uri: userImg }}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 20,
                                marginLeft: 10,
                                borderWidth: 2,
                                borderColor: '#e6eaf3',
                            }}
                        />
                    }
                    theme={theme}
                />
                <FieldBox
                    label="Due Date"
                    value={
                        isEditing
                            ? (editFields.dueDate ? formatDate(editFields.dueDate) : '')
                            : formatDate(issue.dueDate)
                    }
                    placeholder="Due Date"
                    theme={theme}
                    editable={false}
                    onPress={isEditing ? () => setShowDueDatePicker(true) : undefined}
                    rightComponent={
                        isEditing ? (
                            <MaterialIcons name="date-range" size={22} color={theme.primary} />
                        ) : null
                    }
                />
                {showDueDatePicker && (
                    <DateTimePicker
                        value={editFields.dueDate ? new Date(editFields.dueDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDueDatePicker(false);
                            if (selectedDate) {
                                setEditFields(f => ({ ...f, dueDate: selectedDate.toISOString() }));
                            }
                        }}
                        textColor={theme.buttonText}
                        accentColor={theme.buttonText}
                    />
                )}
                <View style={{ height: 1, backgroundColor: '#e6eaf3', marginTop: 18, marginHorizontal: 20 }} />
                {section === 'created' && issue.issueStatus === 'pending_approval' && (
                    <View style={{ marginHorizontal: 0, marginTop: 16 }}>
                        {/* Resolved Attachments */}
                        <FieldBox
                            label="Resolved Attachments"
                            value=""
                            placeholder="Resolved Attachments"
                            rightComponent={
                                (Array.isArray(issue.resolvedImages) && issue.resolvedImages.length > 0) && (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 0,
                                            paddingHorizontal: 6,
                                            backgroundColor: theme.secCard,
                                            borderRadius: 8,
                                            justifyContent: 'center',
                                            alignSelf: 'center',
                                        }}
                                        onPress={() => {
                                            setDrawerVisible(true);
                                            setDrawerAttachments(issue.resolvedImages || []);
                                        }}
                                    >
                                        <MaterialIcons name="folder" size={18} color={theme.primary} />
                                        <Text style={{ color: theme.primary, fontWeight: '500' }}> Open</Text>
                                    </TouchableOpacity>
                                )
                            }
                            theme={theme}
                            containerStyle={{ alignItems: 'center' }}
                        />
                        <FieldBox
                            label="Resolution Remark"
                            value={issue.remarks || ""}
                            placeholder="No resolution remark"
                            multiline
                            theme={theme}
                            editable={false}
                        />
                    </View>
                )}
                {section === 'assigned' && issue.issueStatus === 'resolved' && (
                    <View style={{ marginHorizontal: 0, marginTop: 16 }}>
                        {/* Show previous resolved attachments */}
                        <FieldBox
                            label="Resolved Attachments"
                            value=""
                            placeholder="Resolved Attachments"
                            rightComponent={
                                (Array.isArray(issue.resolvedImages) && issue.resolvedImages.length > 0) && (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 0,
                                            paddingHorizontal: 6,
                                            backgroundColor: theme.secCard,
                                            borderRadius: 8,
                                            justifyContent: 'center',
                                            alignSelf: 'center',
                                        }}
                                        onPress={() => {
                                            setDrawerVisible(true);
                                            setDrawerAttachments(issue.resolvedImages || []);
                                        }}
                                    >
                                        <MaterialIcons name="folder" size={18} color={theme.primary} />
                                        <Text style={{ color: theme.primary, fontWeight: '500' }}> Open</Text>
                                    </TouchableOpacity>
                                )
                            }
                            theme={theme}
                            containerStyle={{ alignItems: 'center' }}
                        />
                        {/* Show previous resolution remark */}
                        <FieldBox
                            label="Resolution Remark"
                            value={issue.remarks || ""}
                            placeholder="No resolution remark"
                            multiline
                            theme={theme}
                            editable={false}
                        />
                    </View>
                )}
                {section === 'assigned' && issue.issueStatus !== 'resolved' && issue.issueStatus !== 'pending_approval' && (
                    <View style={{ marginBottom: 24 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 16,
                                paddingHorizontal: 20,
                                borderRadius: 8,
                                justifyContent: 'flex-start',
                                alignSelf: 'flex-start',
                            }}
                        >
                            <Text style={{ fontWeight: '400', paddingHorizontal: 6, fontSize: 16, color: theme.text }}>
                                Resolve Issue
                            </Text>
                        </View>
                        <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Add Attachments"
                                placeholderTextColor={theme.secondaryText}
                                editable={false}
                            />
                            <Feather name="paperclip" size={20} color="#888" style={styles.inputIcon} onPress={() => setShowAttachmentSheet(true)} />
                            <MaterialCommunityIcons
                                name={isRecording ? "microphone" : "microphone-outline"}
                                size={20}
                                color={isRecording ? "#E53935" : "#888"}
                                style={styles.inputIcon}
                                onPress={isRecording ? stopRecording : startRecording}
                            />
                            {isRecording && (
                                <Text style={{ color: "#E53935", marginLeft: 8 }}>{seconds}s</Text>
                            )}
                        </View>
                        {attachments.length > 0 && (
                            <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                                {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
                                    <View key={rowIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        {[0, 1].map(colIdx => {
                                            const idx = rowIdx * 2 + colIdx;
                                            const att = attachments[idx];
                                            if (!att) return <View key={colIdx} style={{ flex: 1 }} />;
                                            return (
                                                <View
                                                    key={att.uri || att.name || idx}
                                                    style={{
                                                        flex: 1,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        padding: 8,
                                                        borderWidth: 1,
                                                        borderColor: '#ccc',
                                                        borderRadius: 10,
                                                        backgroundColor: '#F9FAFB',
                                                        marginRight: colIdx === 0 ? 12 : 0
                                                    }}
                                                >
                                                    {att.type?.startsWith('image') && (
                                                        <TouchableOpacity>
                                                            <Image source={{ uri: att.uri }} style={{ width: 25, height: 25, borderRadius: 6, marginRight: 8 }} />
                                                        </TouchableOpacity>
                                                    )}
                                                    {att.type?.startsWith('audio') && (
                                                        <TouchableOpacity
                                                            onPress={async () => {
                                                                const { Sound } = await import('expo-av');
                                                                const { sound } = await Sound.createAsync({ uri: att.uri });
                                                                await sound.playAsync();
                                                            }}
                                                            style={{ marginRight: 8 }}
                                                        >
                                                            <MaterialCommunityIcons name="play-circle-outline" size={28} color="#1D4ED8" />
                                                        </TouchableOpacity>
                                                    )}
                                                    {!att.type?.startsWith('image') && !att.type?.startsWith('audio') && (
                                                        <MaterialCommunityIcons name="file-document-outline" size={28} color="#888" style={{ marginRight: 8 }} />
                                                    )}
                                                    <Text style={{ color: '#444', fontSize: 13, flex: 1 }}>
                                                        {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 20
                                                            ? (att.name || att.uri?.split('/').pop()).slice(0, 15) + '...'
                                                            : (att.name || att.uri?.split('/').pop())}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setAttachments(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        <MaterialCommunityIcons name="close-circle" size={22} color="#E53935" />
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        )}
                        <AttachmentSheet
                            visible={showAttachmentSheet}
                            onClose={() => setShowAttachmentSheet(false)}
                            onPick={async (type) => {
                                await pickAttachment(type);
                                setShowAttachmentSheet(false);
                            }}
                        />
                        <FieldBox
                            label="Resolution Remark"
                            value={remark}
                            onChangeText={setRemark}
                            placeholder="Describe how the issue was resolved..."
                            multiline
                            theme={theme}
                            editable={true}
                        />
                    </View>
                )}
                {section === 'created' && (
                    <View style={{ flexDirection: 'row', justifyContent: isEditing ? 'flex-end' : 'space-between', marginHorizontal: 20, marginTop: 20, gap: 12 }}>
                        {!isEditing && (
                            <>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: theme.secondaryButton + '11',
                                        borderRadius: 16,
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: theme.secondaryButton,
                                    }}
                                    onPress={() => setShowReassignModal(true)}
                                >
                                    <Text style={{ color: theme.secondaryButton, fontWeight: '600', fontSize: 16 }}>No, Re-assign</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: theme.buttonText + '22',
                                        borderRadius: 16,
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: theme.buttonText,
                                    }}
                                    onPress={async () => {
                                        try {
                                            setLoading(true);
                                            await approveIssue(issue.issueId);
                                            Alert.alert('Success', 'Issue approved and marked as resolved.');
                                            const updated = await fetchIssueById(issueId);
                                            setIssue(updated);
                                        } catch (err) {
                                            Alert.alert('Error', err.message || 'Failed to approve issue');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={issue.isApproved === true}
                                >
                                    <Text style={{ color: theme.buttonText, fontWeight: '700', fontSize: 16 }}>
                                        {issue.issueStatus === 'resolved' ? 'Resolved' : 'Approve & Complete'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
                {section === 'assigned' && (
                    <View style={{ marginHorizontal: 20, marginTop: 20 }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.card,
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: theme.buttonText,
                                opacity:
                                    issue.issueStatus === 'pending_approval' ||
                                        issue.issueStatus === 'resolved' ||
                                        attachments.length === 0 ||
                                        !remark
                                        ? 0.5
                                        : 1,
                            }}
                            onPress={handleSubmit}
                            disabled={
                                issue.issueStatus === 'pending_approval' ||
                                issue.issueStatus === 'resolved' ||
                                attachments.length === 0 ||
                                !remark
                            }
                        >
                            <Text style={{ color: theme.buttonText, fontWeight: '600', fontSize: 16 }}>
                                {issue.issueStatus === 'resolved'
                                    ? 'Resolved'
                                    : issue.issueStatus === 'pending_approval'
                                        ? 'Waiting for Approval'
                                        : 'Submit Resolution'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
            <AttachmentDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                attachments={drawerAttachments.length ? drawerAttachments : allAttachments}
                theme={theme}
                onAttachmentPress={item => {
                    setSelectedAttachment(item);
                    setPreviewVisible(true);
                    setDrawerVisible(false);
                }}
            />
            <ImageModal
                visible={imageModalVisible}
                image={selectedImage}
                onClose={() => setImageModalVisible(false)}
                theme={theme}
            />
            <AttachmentPreviewModal
                visible={previewVisible}
                onClose={() => {
                    setPreviewVisible(false);
                    setSelectedAttachment(null);
                }}
                attachment={selectedAttachment}
                theme={theme}
                onImagePress={uri => {
                    setSelectedImage(uri);
                    setImageModalVisible(true);
                    setPreviewVisible(false);
                }}
            />
            <ReassignPopup
                visible={showReassignModal}
                onClose={async () => {
                    setShowReassignModal(false);
                    setLoading(true);
                    try {
                        const updated = await fetchIssueById(issueId);
                        setIssue(updated);
                    } catch { }
                    setLoading(false);
                }}
                issueId={issue?.issueId || issueId}
                theme={theme}
            />
        </View>
    );
}
const styles = StyleSheet.create({
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
        paddingRight: 8,
        color: '#222',
    },
    inputIcon: {
        marginLeft: 8,
    },
    attachmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    attachmentBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
        marginRight: 12,
    },
    attachmentImage: {
        width: 25,
        height: 25,
        borderRadius: 6,
        marginRight: 8,
        backgroundColor: '#eee',
    },
    attachmentFileName: {
        color: '#444',
        fontSize: 13,
        flex: 1,
    },
    removeIcon: {
        marginLeft: 8,
    },
    bannerDesc: {
        color: '#e6eaf3',
        fontSize: 14,
        fontWeight: '400',
        maxWidth: "80%",
        marginTop: 5
    },
});