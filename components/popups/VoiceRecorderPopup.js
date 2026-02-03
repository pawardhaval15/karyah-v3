
import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useAudioRecorder from './useAudioRecorder';

export default function VoiceRecorderPopup({ visible, onClose, onRecord, theme }) {
    const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
        onRecordingFinished: (file) => {
            onRecord(file);
            onClose(); // Close after successful recording
        }
    });

    // Automatically start recording when modal opens
    useEffect(() => {
        let mounted = true;
        if (visible) {
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => {
                if (mounted && !isRecording) startRecording();
            }, 500);
            return () => {
                clearTimeout(timer);
                mounted = false;
            };
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    <Text style={[styles.title, { color: theme.text }]}>Recording Audio...</Text>

                    <View style={styles.timerContainer}>
                        <View style={[styles.pulseRing, { borderColor: theme.primary }]} />
                        <Feather name="mic" size={40} color={theme.primary} />
                        <Text style={[styles.timer, { color: theme.primary }]}>
                            {new Date(seconds * 1000).toISOString().substr(14, 5)}
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: theme.border, marginRight: 10 }]}>
                            <Text style={{ color: theme.secondaryText, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={stopRecording} style={[styles.btn, { backgroundColor: '#E53935' }]}>
                            <Feather name="square" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Stop & Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    container: { width: '80%', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 10 },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 30 },
    timerContainer: { alignItems: 'center', marginBottom: 40, justifyContent: 'center' },
    timer: { fontSize: 36, fontWeight: '700', marginTop: 16, fontVariant: ['tabular-nums'] },
    pulseRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        opacity: 0.2,
        top: -20,
    },
    actions: { flexDirection: 'row', width: '100%', justifyContent: 'center' },
    btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }
});
