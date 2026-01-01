import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  ScrollView,
  Platform,
  Linking,
  InteractionManager
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getFileName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item.split('/').pop() || 'Attachment';
  if (item.name) return item.name;
  if (item.uri && typeof item.uri === 'string') return item.uri.split('/').pop() || 'Attachment';
  return 'Attachment';
}

export default function AttachmentPreviewModal({ visible, onClose, attachments = [], initialIndex = 0, theme }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  // Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // --- SYNC INDEX (iOS Fix) ---
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setCurrentIndex(initialIndex);

      const task = InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
            } catch (e) {
              console.log("Initial scroll deferred:", e);
            }
          }
        }, 500);
      });

      return () => task.cancel();
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound, currentIndex]);

  const currentAttachment = attachments[currentIndex];

  // --- Navigation Logic ---
  const changeSlide = (newIndex) => {
    setLoading(true);
    setCurrentIndex(newIndex);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    resetAudio();
  };

  const goToNext = () => {
    if (currentIndex < attachments.length - 1) {
      changeSlide(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      changeSlide(currentIndex - 1);
    }
  };

  const resetAudio = async () => {
    setIsPlaying(false);
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
  };

  // --- Handlers ---
  const handlePlayPauseAudio = async (uri) => {
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      if (!sound) {
        setAudioLoading(true);
        try {
          const { sound: newSound } = await Audio.Sound.createAsync({ uri });
          setSound(newSound);
          await newSound.playAsync();
          setIsPlaying(true);
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
              newSound.setPositionAsync(0);
            }
          });
        } catch (e) {
          Alert.alert('Error', 'Could not play audio file');
        } finally {
          setAudioLoading(false);
        }
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const handleDownload = async () => {
    if (!currentAttachment) return;
    const uri = currentAttachment.uri || currentAttachment;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Need permissions to save file.');
        return;
      }
      const fileName = getFileName(currentAttachment);
      const localUri = FileSystem.documentDirectory + fileName;
      const downloadRes = await FileSystem.downloadAsync(uri, localUri);
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
      const albums = await MediaLibrary.getAlbumsAsync();
      let album = albums.find((alb) => alb.title === 'Karyah Downloads');
      if (!album) {
        await MediaLibrary.createAlbumAsync('Karyah Downloads', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
      }
      Alert.alert('Success', 'Downloaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to download.');
    }
  };

  const renderItem = ({ item }) => {
    const uri = item.uri || (typeof item === 'string' ? item : '');

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(uri);
    const isAudio = /\.(m4a|mp3|wav|aac)$/i.test(uri);
    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(uri);
    const isPdf = /\.(pdf)$/i.test(uri);
    const isOffice = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(uri);

    // 1. IMAGE (Zoomable)
    if (isImage) {
      return (
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' }}>
          {Platform.OS === 'ios' ? (
            // --- IOS: Native ScrollView ---
            <ScrollView
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom={true}
              centerContent={true}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Image
                source={{ uri }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                resizeMode="contain"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
              />
            </ScrollView>
          ) : (
            // --- ANDROID: FIXED ZoomableView ---
            <ReactNativeZoomableView
              maxZoom={5}
              minZoom={1}
              zoomStep={0.5}
              initialZoom={1}
              bindToBorders={false}
              panBoundaryPadding={0}
              zoomEnabled={true}
              panEnabled={true}
              doubleTapEnabled={true}
              doubleTapDelay={300}
              captureEvent={true}
              style={{ flex: 1 }}
              onZoomAfter={() => setLoading(false)}
              onZoomBefore={() => setLoading(true)}
            >
              {/* FULL SCREEN TOUCH SURFACE */}
              <View style={{
                flex: 1,
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'transparent'
              }}>
                <Image
                  source={{ uri }}
                  style={{
                    width: SCREEN_WIDTH * 0.9,  // Perfectly centered
                    height: SCREEN_HEIGHT * 0.9,
                    resizeMode: 'contain'
                  }}
                  onLoadStart={() => setLoading(true)}
                  onLoadEnd={() => setLoading(false)}
                />
              </View>
            </ReactNativeZoomableView>
          )}
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        </View>
      );
    }

    // 2. VIDEO
    if (isVideo) {
      return (
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
          <Video
            style={{ width: SCREEN_WIDTH, height: 300 }}
            source={{ uri }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
          />
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        </View>
      );
    }

    // 3. AUDIO
    if (isAudio) {
      return (
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.audioCard, { backgroundColor: theme.card }]}>
            <Feather name="music" size={50} color={theme.primary} style={{ marginBottom: 20 }} />
            <Text style={{ color: theme.text, marginBottom: 20, fontSize: 16 }}>{getFileName(item)}</Text>
            <TouchableOpacity onPress={() => handlePlayPauseAudio(uri)}>
              {audioLoading ? <ActivityIndicator color={theme.primary} /> : <Feather name={isPlaying ? 'pause-circle' : 'play-circle'} size={64} color={theme.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // 4. DOCS (PDF/Excel)
    if (isPdf || isOffice) {
      let sourceUri = uri;
      if (isOffice) {
        sourceUri = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(uri)}`;
      } else if (Platform.OS === 'android' && isPdf) {
        sourceUri = `https://docs.google.com/viewer?url=${encodeURIComponent(uri)}&embedded=true`;
      }

      return (
        <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, paddingTop: 80, paddingBottom: 80 }}>
          <WebView
            source={{ uri: sourceUri }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.loaderOverlay, { backgroundColor: 'transparent' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
            scalesPageToFit={true}
            builtInZoomControls={true}
            displayZoomControls={false}
            scrollEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            onError={(e) => console.log('WebView Error', e.nativeEvent)}
          />
          <View style={{ position: 'absolute', bottom: 20, alignSelf: 'center' }}>
            <TouchableOpacity style={styles.fallbackBtn} onPress={() => Linking.openURL(uri)}>
              <Text style={{ color: '#fff', fontSize: 12 }}>Open externally</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // 5. FALLBACK
    return (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
        <Feather name="file" size={64} color={theme.secondaryText} />
        <Text style={{ color: theme.text, marginTop: 20 }}>Preview not available</Text>
        <TouchableOpacity style={[styles.fallbackBtn, { marginTop: 20 }]} onPress={() => Linking.openURL(uri)}>
          <Text style={{ color: '#fff' }}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* --- Header --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentIndex + 1} / {attachments.length}</Text>
          <View style={{ width: 40 }} />
          {/* Download Button Added Back */}
          <TouchableOpacity onPress={handleDownload} style={styles.iconButton}>
            <Feather name="download" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* --- Content Viewer --- */}
        <FlatList
          ref={flatListRef}
          data={attachments}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          pagingEnabled
          scrollEnabled={false} // Disable Swipe
          showsHorizontalScrollIndicator={false}
          getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 100));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            });
          }}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={2}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {/* --- BOTTOM CONTROLS --- */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.arrowButton, { opacity: currentIndex > 0 ? 1 : 0.3 }]}
            onPress={goToPrev}
            disabled={currentIndex === 0}
          >
            <Feather name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.fileName} numberOfLines={1}>
            {getFileName(currentAttachment)}
          </Text>
          <TouchableOpacity
            style={[styles.arrowButton, { opacity: currentIndex < attachments.length - 1 ? 1 : 0.3 }]}
            onPress={goToNext}
            disabled={currentIndex === attachments.length - 1}
          >
            <Feather name="chevron-right" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 15
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10
  },
  arrowButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30
  },
  audioCard: { width: '80%', padding: 30, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loaderOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 5
  },
  fallbackBtn: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 20 },
});
