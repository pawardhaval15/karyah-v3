import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { FullscreenImageModal } from './FullscreenImageModal';

function getFileName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item.split('/').pop() || 'Attachment';
  if (item.name) return item.name;
  if (item.uri && typeof item.uri === 'string') return item.uri.split('/').pop() || 'Attachment';
  return 'Attachment';
}

export default function AttachmentPreviewModal({ visible, onClose, attachment, theme }) {
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const uri =
    (attachment &&
      (attachment.uri || (typeof attachment === 'string' ? attachment : null))) ||
    '';
  const ext = getFileName(attachment).split('.').pop()?.toLowerCase() || '';
  const isImage =
    typeof uri === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(uri);
  const isAudio = typeof uri === 'string' && /\.(m4a|mp3|wav)$/i.test(uri);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPauseAudio = async () => {
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      if (!sound) {
        setLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        setSound(newSound);
        await newSound.playAsync();
        setIsPlaying(true);
        setLoading(false);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            newSound.setPositionAsync(0);
          }
        });
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to save files.');
        return;
      }

      const fileName = getFileName(attachment);
      const localUri = FileSystem.documentDirectory + fileName;

      // Download the file to local storage
      const downloadRes = await FileSystem.downloadAsync(uri, localUri);

      // Create asset from downloaded file
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);

      // Check if album exists
      const albums = await MediaLibrary.getAlbumsAsync();
      let album = albums.find((alb) => alb.title === 'Karyah Downloads');

      if (!album) {
        // If not, create new album with asset
        await MediaLibrary.createAlbumAsync('Karyah Downloads', asset, false);
      } else {
        // If yes, add asset to the album
        await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
      }

      Alert.alert('Success', 'File downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Error', 'Failed to download file.');
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.bg}>
          <View style={[styles.sheet, { backgroundColor: theme.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Preview</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            {!attachment ? (
              <Text style={{ color: theme.text, textAlign: 'center', marginTop: 40 }}>
                No attachment to preview
              </Text>
            ) : isImage ? (
              <TouchableOpacity
                style={{ alignItems: 'center', marginVertical: 20 }}
                onPress={() => setShowImageModal(true)}
              >
                {loading && (
                  <View style={{ position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                  </View>
                )}
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: 250, borderRadius: 12, backgroundColor: '#eee' }}
                  resizeMode="contain"
                  onLoadEnd={() => setLoading(false)}
                />
                <Text style={{ color: theme.primary, marginTop: 10 }}>Tap to view fullscreen</Text>
              </TouchableOpacity>
            ) : isAudio ? (
              <View style={{ alignItems: 'center', marginVertical: 40 }}>
                <TouchableOpacity onPress={handlePlayPauseAudio} style={{ alignItems: 'center' }}>
                  <Feather name={isPlaying ? 'pause-circle' : 'play-circle'} size={64} color={theme.primary} />
                  <Text style={{ color: theme.primary, marginTop: 10 }}>
                    {isPlaying ? 'Pause Audio' : 'Play Audio'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{ alignItems: 'center', marginVertical: 40 }}
                onPress={async () => {
                  try {
                    await Linking.openURL(uri);
                  } catch {
                    alert('Unable to open file.');
                  }
                }}
              >
                <Feather name={ext === 'pdf' ? 'file-text' : 'file'} size={64} color={theme.primary} />
                <Text style={{ color: theme.primary, marginTop: 10 }}>Open File</Text>
              </TouchableOpacity>
            )}

            {attachment && (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: theme.text, textAlign: 'center' }}>{getFileName(attachment)}</Text>
                <TouchableOpacity onPress={handleDownload} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="download" size={20} color={theme.primary} />
                  <Text style={{ color: theme.primary, marginLeft: 6 }}>Download</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <FullscreenImageModal
        visible={showImageModal}
        uri={uri}
        onClose={() => setShowImageModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    minHeight: 340,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
