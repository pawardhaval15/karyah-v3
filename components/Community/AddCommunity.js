import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { createCommunity } from '../../utils/community';

export default function CreateCommunityModal({ visible, onClose, onCreate, organizationId }) {
    const theme = useTheme();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('public'); // or 'private' or options you support
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Community name is required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await createCommunity(organizationId, name.trim(), description.trim(), visibility);
            onClose();
            // Optionally reset fields here if you want fresh form next open
            setName('');
            setDescription('');
            setVisibility('public');
        } catch (err) {
            setError(err.message || 'Failed to create community');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.title, { color: theme.text }]}>Create New Community</Text>

                    <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        placeholder="Community Name"
                        placeholderTextColor={theme.secondaryText}
                        value={name}
                        onChangeText={setName}
                        editable={!loading}
                    />
                    <TextInput
                        style={[
                            styles.input,
                            styles.multilineInput,
                            { borderColor: theme.border, color: theme.text },
                        ]}
                        placeholder="Description (optional)"
                        placeholderTextColor={theme.secondaryText}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        editable={!loading}
                    />
                    {/* Example visibility toggle, customize UI as needed */}
                    <View style={{ flexDirection: 'row', marginVertical: 10 }}>
                        <TouchableOpacity
                            style={[
                                styles.visibilityOption,
                                visibility === 'public' && { backgroundColor: '#366CD9' },
                            ]}
                            onPress={() => !loading && setVisibility('public')}>
                            <Text style={{ color: visibility === 'public' ? '#fff' : theme.text }}>
                                Public
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.visibilityOption,
                                visibility === 'private' && { backgroundColor: '#366CD9' },
                                { marginLeft: 12 },
                            ]}
                            onPress={() => !loading && setVisibility('private')}>
                            <Text style={{ color: visibility === 'private' ? '#fff' : theme.text }}>
                                Private
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {!!error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#ccc' }]}
                            onPress={onClose}
                            disabled={loading}>
                            <Text style={{ color: '#333' }}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#366CD9' }]}
                            onPress={handleCreate}
                            disabled={loading}>
                            <Text style={{ color: '#fff' }}>{loading ? 'Creating...' : 'Create'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        borderRadius: 16,
        padding: 20,
        backgroundColor: '#fff',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        fontSize: 16,
        marginBottom: 12,
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    visibilityOption: {
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderColor: '#366CD9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 12,
        fontWeight: '500',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
});
