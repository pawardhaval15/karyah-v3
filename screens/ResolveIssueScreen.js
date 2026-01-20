// 📄 screens/ResolveIssueScreen.js

import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
// import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import GradientButton from '../components/Login/GradientButton';
import AttachmentSheet from '../components/popups/AttachmentSheet';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import useAudioRecorder from '../components/popups/useAudioRecorder';
import DateBox from '../components/project details/DateBox';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { fetchIssueById, resolveIssueByAssignedUser } from '../utils/issues';
const userImg = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
const ResolveIssueScreen = () => {
    const { params } = useRoute();
    const navigation = useNavigation();
    const theme = useTheme();
    const { issueId } = params || {};

    const [issue, setIssue] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerAttachments, setDrawerAttachments] = useState([]);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const { attachments, pickAttachment, setAttachments } = useAttachmentPicker();

    const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
        onRecordingFinished: (audioFile) => {
            setAttachments(prev => [...prev, audioFile]);
            Alert.alert('Audio attached!');
        }
    });

    useEffect(() => {
        if (issueId) {
            fetchIssueById(issueId)
                .then(setIssue)
                .catch(err => Alert.alert('Error', err.message));
        }
    }, [issueId]);

    const handleSubmit = async () => {
        if (!remarks.trim() && attachments.length === 0) {
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
                remarks,
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

    if (!issue) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1D4ED8" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            <TouchableOpacity
                style={{
                    marginTop: Platform.OS === 'ios' ? 70 : 25,
                    marginLeft: 16,
                    marginBottom: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
                onPress={() => navigation.goBack()}
            >
                <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
                <Text style={{ fontSize: 18, color: theme.text, fontWeight: '400', marginLeft: 2 }}>
                    Back
                </Text>
            </TouchableOpacity>

            <LinearGradient
                colors={[theme.secondary, theme.primary]}
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
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>
                        {issue.issueTitle}
                    </Text>
                    <Text style={styles.bannerDesc}>All issues details are listed here.</Text>
                </View>
            </LinearGradient>



            <Text style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}>{issue.issueTitle}</Text>
            <FieldBox label="Description" value={issue.description || ''} editable={false} multiline={true} theme={theme} />
            <FieldBox
                label="Added Attachments"
                value=""
                placeholder="Added Attachments"
                rightComponent={
                    (issue?.unresolvedImages?.length > 0) && (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 6,
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
                            <MaterialCommunityIcons name="folder" size={18} color={theme.primary} />
                            <Text style={{ color: theme.primary, fontWeight: '500' }}> Open</Text>
                        </TouchableOpacity>
                    )
                }
                theme={theme}
                containerStyle={{ alignItems: 'center', marginHorizontal: 16, marginBottom: 12 }}
            />


            <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.inputBox, { backgroundColor: 'transparent', borderWidth: 0, margin: 0, paddingLeft: 0, color: theme.text }]}>{issue.creatorName || 'N/A'}</Text>
                <Image source={{ uri: userImg }} style={styles.avatar} />
            </View>

            <View style={styles.dateRow}>
                {/* <DateBox label="Start Date" value={new Date(issue.startDate)} theme={theme} /> */}
                <DateBox label="End Date" value={new Date(issue.dueDate)} theme={theme} />
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Resolve Issue</Text>

            <View style={[styles.attachmentBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.attachmentText, { color: theme.secondaryText }]}>Add Attachments</Text>
                <Feather name="paperclip" size={20} color={theme.secondaryText} style={styles.inputIcon} onPress={() => setShowAttachmentSheet(true)} />
                <MaterialCommunityIcons
                    name={isRecording ? 'microphone' : 'microphone-outline'}
                    size={20}
                    color={isRecording ? '#E53935' : theme.secondaryText}
                    style={styles.inputIcon}
                    onPress={isRecording ? stopRecording : startRecording}
                />
                {isRecording && <Text style={styles.recordingTime}>{seconds}s</Text>}
            </View>

            {attachments.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                    {attachments.map((att, index) => (
                        <View key={index} style={[styles.attachmentItem, { backgroundColor: theme.secCard }]}>
                            {att.type?.startsWith('image') && (
                                <Image source={{ uri: att.uri }} style={styles.attachmentPreview} />
                            )}
                            {att.type?.startsWith('audio') && (
                                <MaterialCommunityIcons name="play-circle-outline" size={28} color={theme.primary} />
                            )}
                            {!att.type?.startsWith('image') && !att.type?.startsWith('audio') && (
                                <MaterialCommunityIcons name="file-document-outline" size={28} color={theme.secondaryText} />
                            )}
                            <Text numberOfLines={1} style={[styles.attachmentName, { color: theme.text }]}>
                                {att.name || att.uri.split('/').pop()}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setAttachments(prev => prev.filter((_, i) => i !== index));
                            }}>
                                <MaterialCommunityIcons name="close-circle" size={22} color="#E53935" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <View style={[styles.inputBoxMultiline, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                    multiline
                    style={[styles.textArea, { color: theme.text }]}
                    placeholder="Describe how the issue was resolved..."
                    placeholderTextColor={theme.secondaryText}
                    value={remarks}
                    onChangeText={setRemarks}
                />
            </View>

            <View style={styles.submitBtn}>
                <GradientButton title="Submit Resolution" onPress={handleSubmit} disabled={loading}>
                    {loading && <ActivityIndicator size="small" color="#fff" />}
                </GradientButton>
            </View>

            <AttachmentSheet
                visible={showAttachmentSheet}
                onClose={() => setShowAttachmentSheet(false)}
                onPick={async (type) => {
                    await pickAttachment(type);
                    setShowAttachmentSheet(false);
                }}
            />
            <AttachmentDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                attachments={drawerAttachments}
                theme={theme}
                onAttachmentPress={item => {
                    setSelectedAttachment(item);
                    setPreviewVisible(true);
                    setDrawerVisible(false);
                }}
            />

            {/* 
            {drawerVisible && (
                <AttachmentSheet
                    visible={drawerVisible}
                    onClose={() => setDrawerVisible(false)}
                    files={drawerAttachments}
                    onImagePress={(imageUri) => {
                        setSelectedImage(imageUri);
                        setImageModalVisible(true);
                    }}
                />
            )} */}

            {imageModalVisible && selectedImage && (
                <Modal visible={imageModalVisible} transparent animationType="fade">
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setImageModalVisible(false)}
                    >
                        <Image source={{ uri: selectedImage }} style={{ width: '90%', height: '70%', resizeMode: 'contain' }} />
                    </TouchableOpacity>
                </Modal>
            )}

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#1D4ED8',
        padding: 16,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    headerSub: { color: '#E0E7FF', fontSize: 13, marginTop: 2 },
    inputBox: {
        backgroundColor: '#F8FAFC',
        margin: 16,
        padding: 14,
        borderRadius: 14,
        fontSize: 16,
        color: '#222',
    },
    inputBoxMultiline: {
        marginHorizontal: 16,
        marginTop: 6,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 16,
        marginBottom: 8,
        color: '#1E293B',
    },
    row: {
        flexDirection: 'row',
        marginHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 14,
        marginBottom: 12,
    },
    avatar: { width: 34, height: 34, borderRadius: 17 },
    attachmentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        borderRadius: 14,
        height: 54,
    },
    attachmentText: { flex: 1, color: '#555' },
    inputIcon: { marginLeft: 10 },
    recordingTime: { color: '#E53935', marginLeft: 8 },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 8,
        borderRadius: 10,
        marginBottom: 8,
        gap: 10,
    },
    attachmentPreview: { width: 28, height: 28, borderRadius: 6 },
    attachmentName: { flex: 1, color: '#333', fontSize: 13 },
    textArea: { minHeight: 100, fontSize: 15, color: '#333' },
    submitBtn: { marginHorizontal: 16, marginTop: 20 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 14,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 4,
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

export default ResolveIssueScreen;