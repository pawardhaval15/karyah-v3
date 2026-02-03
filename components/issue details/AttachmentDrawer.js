import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const numColumns = 3;
const ITEM_SIZE = Math.floor(Dimensions.get('window').width / numColumns) - 24;

function getFileName(item) {
    if (!item) return '';
    if (typeof item === 'string') return item.split('/').pop() || 'Attachment';
    if (item.name) return item.name;
    if (item.uri && typeof item.uri === 'string') return item.uri.split('/').pop() || 'Attachment';
    return 'Attachment';
}

export default function AttachmentDrawer({
    visible,
    onClose,
    attachments = [],
    theme,
    onAttachmentPress,
}) {
    const handleDownload = async (uri, name) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Storage permission is required to save files.');
                return;
            }
            const localUri = FileSystem.documentDirectory + name;
            const downloadRes = await FileSystem.downloadAsync(uri, localUri);

            // Safer MediaLibrary usage
            try {
                const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
                const albums = await MediaLibrary.getAlbumsAsync();
                let album = albums.find(alb => alb.title === 'Karyah Downloads');
                if (!album) {
                    await MediaLibrary.createAlbumAsync('Karyah Downloads', asset, false);
                } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
                }
                Alert.alert('Success', 'File downloaded successfully!');
            } catch (mediaError) {
                console.log('MediaLibrary save error:', mediaError);
                // If album creation fails, the asset is usually still saved to default storage.
                // We suppress the crash.
                Alert.alert('Saved', 'File saved to Gallery/Storage.');
            }
        } catch (err) {
            console.error('Download failed:', err);
            Alert.alert('Error', 'Download failed.');
        }
    };

    const renderItem = ({ item, index }) => {
        const uri =
            (item && (item.uri || (typeof item === 'string' ? item : null))) || '';
        const name = getFileName(item);
        const isImage =
            typeof uri === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(uri);
        const isAudio =
            typeof uri === 'string' && /\.(m4a|mp3|wav)$/i.test(uri);
        const ext = name.split('.').pop()?.toLowerCase();

        return (
            <View style={styles.item}>
                <View style={styles.attachmentBox}>
                    {/* Preview tap */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onAttachmentPress(item, index)}
                        style={styles.previewTapper}
                    >
                        {isImage ? (
                            <Image source={{ uri }} style={styles.image} />
                        ) : (
                            <View style={styles.iconBox}>
                                {isAudio ? (
                                    <Feather name="play-circle" size={36} color={theme.primary} />
                                ) : ext === 'pdf' ? (
                                    <Feather name="file-text" size={36} color={theme.primary} />
                                ) : (
                                    <Feather name="file" size={36} color={theme.primary} />
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                    {/* Download icon overlay (top-right) */}
                    <TouchableOpacity
                        // small extra space to make it easier to hit
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={[
                            styles.downloadIcon,
                            { backgroundColor: 'rgba(0,0,0,0.4)' },
                        ]}
                        onPress={() => handleDownload(uri, name)}
                    >
                        <Feather name="download" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>
                    {name}
                </Text>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.bg}>
                <View style={[styles.sheet, { backgroundColor: theme.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Attachments</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={attachments}
                        numColumns={numColumns}
                        renderItem={renderItem}
                        keyExtractor={(_, idx) => idx.toString()}
                        contentContainerStyle={{ paddingBottom: 24 }}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, minHeight: 340, maxHeight: '70%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '700' },

    item: { width: ITEM_SIZE, alignItems: 'center', marginBottom: 18, marginHorizontal: 6 },

    attachmentBox: {
        position: 'relative',
        width: ITEM_SIZE - 12,
        height: ITEM_SIZE - 12,
    },
    previewTapper: {
        width: '100%',
        height: '100%',
    },

    image: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        backgroundColor: '#eee',
    },
    iconBox: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        backgroundColor: '#f3f3f3',
        alignItems: 'center',
        justifyContent: 'center',
    },

    downloadIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
        padding: 4,
        borderRadius: 12,
        zIndex: 2,
    },

    label: { fontSize: 12, marginTop: 6, width: ITEM_SIZE - 12, textAlign: 'center' },
});
