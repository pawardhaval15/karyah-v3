import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function FilePreviewModal({
  visible,
  onClose,
  attachments,
  onRemoveFile,
  theme,
  getFileType,
  getFileIcon,
  getFormattedSize
}) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const selectedFile = attachments[selectedFileIndex];

  const playAudio = async (file) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: file.uri });
      await sound.playAsync();
      Alert.alert('Playing Audio', `Playing: ${file.name}`);
    } catch (error) {
      Alert.alert('Error', 'Could not play audio file');
    }
  };

  const renderFilePreview = (file) => {
    const fileType = getFileType(file);
    console.log('File preview - Type:', fileType, 'File:', file);

    switch (fileType) {
      case 'image':
        return (
          <TouchableOpacity
            onPress={() => setShowFullPreview(true)}
            style={styles.imagePreview}>
            <Image
              source={{ uri: file.uri }}
              style={styles.previewImage}
              resizeMode="contain"
              onError={(error) => {
                console.log('Image load error:', error);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', file.uri);
              }}
            />
            <View style={styles.imageOverlay}>
              <Feather name="maximize-2" size={24} color="white" />
            </View>
          </TouchableOpacity>
        );

      case 'pdf':
        return (
          <View style={[styles.noPreview, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={64} color="#E53935" />
            <Text style={[styles.noPreviewText, { color: theme.text }]}>
              PDF Document
            </Text>
            <Text style={[styles.fileName, { color: theme.secondaryText }]}>
              {file.name}
            </Text>
            <Text style={[styles.fileSize, { color: theme.secondaryText }]}>
              {getFormattedSize(file.size, file.isExisting)}
            </Text>
            <Text style={[styles.previewNote, { color: theme.secondaryText }]}>
              PDF preview not available. File will be uploaded.
            </Text>
          </View>
        );

      case 'video':
        return (
          <View style={[styles.noPreview, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons name="video" size={64} color="#1976D2" />
            <Text style={[styles.noPreviewText, { color: theme.text }]}>
              Video File
            </Text>
            <Text style={[styles.fileName, { color: theme.secondaryText }]}>
              {file.name}
            </Text>
            <Text style={[styles.fileSize, { color: theme.secondaryText }]}>
              {getFormattedSize(file.size, file.isExisting)}
            </Text>
          </View>
        );

      case 'audio':
        return (
          <View style={[styles.noPreview, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons name="music" size={64} color="#388E3C" />
            <Text style={[styles.noPreviewText, { color: theme.text }]}>
              Audio File
            </Text>
            <Text style={[styles.fileName, { color: theme.secondaryText }]}>
              {file.name}
            </Text>
            <Text style={[styles.fileSize, { color: theme.secondaryText }]}>
              {getFormattedSize(file.size, file.isExisting)}
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#388E3C' }]}
              onPress={() => playAudio(file)}>
              <MaterialCommunityIcons name="play" size={20} color="white" />
              <Text style={styles.actionButtonText}>Play Audio</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        // Check if it might be an image based on URI or name even if type detection failed
        const fileName = file.name || file.uri || '';
        const isImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);

        if (isImageExtension) {
          return (
            <TouchableOpacity
              onPress={() => setShowFullPreview(true)}
              style={styles.imagePreview}>
              <Image
                source={{ uri: file.uri }}
                style={styles.previewImage}
                resizeMode="contain"
                onError={(error) => {
                  console.log('Fallback image load error:', error);
                }}
                onLoad={() => {
                  console.log('Fallback image loaded successfully:', file.uri);
                }}
              />
              <View style={styles.imageOverlay}>
                <Feather name="maximize-2" size={24} color="white" />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <View style={[styles.noPreview, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name={getFileIcon(file)}
              size={64}
              color={theme.secondaryText}
            />
            <Text style={[styles.noPreviewText, { color: theme.text }]}>
              {fileType.charAt(0).toUpperCase() + fileType.slice(1)} File
            </Text>
            <Text style={[styles.fileName, { color: theme.secondaryText }]}>
              {file.name}
            </Text>
            <Text style={[styles.fileSize, { color: theme.secondaryText }]}>
              {getFormattedSize(file.size, file.isExisting)}
            </Text>
          </View>
        );
    }
  };

  const renderFileListItem = ({ item, index }) => {
    const fileType = getFileType(item);
    const fileName = item.name || item.uri || '';
    const isImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
    const isImage = fileType === 'image' || isImageExtension;

    return (
      <TouchableOpacity
        style={[
          styles.fileListItem,
          {
            backgroundColor: index === selectedFileIndex ? `${theme.primary}20` : theme.card,
            borderColor: index === selectedFileIndex ? theme.primary : theme.border,
          }
        ]}
        onPress={() => setSelectedFileIndex(index)}>
        <View style={styles.fileItemLeft}>
          {isImage ? (
            <Image
              source={{ uri: item.uri }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                marginRight: 8,
              }}
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name={getFileIcon(item)}
              size={24}
              color={index === selectedFileIndex ? theme.primary : theme.secondaryText}
            />
          )}
          <View style={styles.fileInfo}>
            <Text
              style={[
                styles.fileListName,
                {
                  color: index === selectedFileIndex ? theme.primary : theme.text,
                  fontWeight: index === selectedFileIndex ? '600' : '400'
                }
              ]}
              numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.fileListSize, { color: theme.secondaryText }]}>
              {getFormattedSize(item.size, item.isExisting)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Remove File',
              `Are you sure you want to remove "${item.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => {
                    onRemoveFile(index);
                    if (index === selectedFileIndex && attachments.length > 1) {
                      setSelectedFileIndex(Math.max(0, index - 1));
                    } else if (attachments.length === 1) {
                      onClose();
                    }
                  }
                }
              ]
            );
          }}
          style={styles.removeButton}>
          <MaterialCommunityIcons name="close-circle" size={20} color="#E53935" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (!visible || !attachments.length) return null;

  return (
    <>
      <Modal
        visible={visible && !showFullPreview}
        animationType="slide"
        transparent
        onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                File Preview ({attachments.length} file{attachments.length > 1 ? 's' : ''})
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* File List */}
              <View style={styles.fileListContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Attached Files</Text>
                <FlatList
                  data={attachments}
                  renderItem={renderFileListItem}
                  keyExtractor={(item, index) => `${item.uri || item.name}-${index}`}
                  showsVerticalScrollIndicator={false}
                  style={styles.fileList}
                />
              </View>

              {/* Preview Area */}
              <View style={styles.previewContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Preview: {selectedFile?.name}
                </Text>
                <View style={[styles.previewArea, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {renderFilePreview(selectedFile)}
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Text style={[styles.footerText, { color: theme.secondaryText }]}>
                Total: {attachments.length} file{attachments.length > 1 ? 's' : ''} •
                Size: {(() => {
                  const totalSize = attachments.reduce((total, file) => total + (file.size || 0), 0);
                  const hasExistingFiles = attachments.some(file => file.isExisting && (!file.size || file.size === 0));
                  return totalSize > 0 ? getFormattedSize(totalSize) + (hasExistingFiles ? ' + existing files' : '') :
                    hasExistingFiles ? 'Contains existing files' : 'Unknown size';
                })()}
              </Text>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={onClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Image Preview Modal */}
      {showFullPreview && selectedFile && (() => {
        const fileType = getFileType(selectedFile);
        const fileName = selectedFile.name || selectedFile.uri || '';
        const isImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
        return fileType === 'image' || isImageExtension;
      })() && (
          <Modal
            visible={true}
            animationType="fade"
            transparent
            onRequestClose={() => setShowFullPreview(false)}>
            <View style={styles.fullPreviewContainer}>
              <TouchableOpacity
                style={styles.fullPreviewClose}
                onPress={() => setShowFullPreview(false)}>
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedFile.uri }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
              <View style={styles.fullPreviewInfo}>
                <Text style={styles.fullPreviewName}>{selectedFile.name}</Text>
                <Text style={styles.fullPreviewSize}>{getFormattedSize(selectedFile.size)}</Text>
              </View>
            </View>
          </Modal>
        )}
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.85,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  fileListContainer: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileList: {
    flex: 1,
  },
  fileListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  fileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fileListName: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileListSize: {
    fontSize: 10,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  previewContainer: {
    flex: 1,
    padding: 12,
  },
  previewArea: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 300,
  },
  imagePreview: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  pdfPreview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPreviewText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    marginBottom: 16,
  },
  previewNote: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  fullPreviewContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  fullPreviewImage: {
    width: screenWidth,
    height: screenHeight,
  },
  fullPreviewInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
  },
  fullPreviewName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fullPreviewSize: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
});
