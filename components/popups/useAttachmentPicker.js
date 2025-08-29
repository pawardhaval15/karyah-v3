import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
export default function useAttachmentPicker() {
  const [attachments, setAttachments] = useState([]);
  const [attaching, setAttaching] = useState(false);

  const normalize = (file) => {
    console.log('Normalizing file:', file);
    
    // Try to get file size from multiple possible properties
    let fileSize = 0;
    if (file.size) fileSize = file.size;
    else if (file.fileSize) fileSize = file.fileSize;
    else if (file.file?.size) fileSize = file.file.size;
    
    // Try to get file type from multiple possible properties
    let fileType = 'application/octet-stream';
    if (file.type) fileType = file.type;
    else if (file.mimeType) fileType = file.mimeType;
    else if (file.file?.type) fileType = file.file.type;
    else {
      // Guess type from file extension
      const extension = (file.name || file.uri || '').toLowerCase().split('.').pop();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          fileType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
          break;
        case 'pdf':
          fileType = 'application/pdf';
          break;
        case 'mp4':
        case 'mov':
        case 'avi':
          fileType = `video/${extension}`;
          break;
        case 'mp3':
        case 'wav':
        case 'm4a':
          fileType = `audio/${extension}`;
          break;
        default:
          fileType = 'application/octet-stream';
      }
    }
    async function requestPermissions() {
  if (Platform.OS === 'android') {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Storage permission is required to select files.');
      return false;
    }
  }
  return true;
}
    const normalized = {
      uri: file.uri,
      name: file.name || file.fileName || file.uri?.split('/').pop() || 'Unknown file',
      type: fileType,
      size: fileSize,
      isExisting: file.isExisting || false,
    };
    
    console.log('Normalized file:', normalized);
    return normalized;
  };

  // Helper function to validate file size (limit: 50MB per file)
  const validateFileSize = (files) => {
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      Alert.alert(
        'File Size Error', 
        `Some files are too large (max 50MB). ${oversizedFiles.length} file(s) were skipped.`
      );
      return files.filter(file => file.size <= maxSize);
    }
    return files;
  };

  const pickAttachment = async (type) => {
    try {
      setAttaching(true);
      let result;
      let pickedFiles = [];
      if (type === 'photo') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { setAttaching(false); return []; }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: 10, // Allow up to 10 images at once
          quality: 0.8, // Optimize file size
        });
        if (!result.canceled) {
          console.log('ImagePicker result:', result);
          const normalizedFiles = result.assets.map(normalize);
          console.log('Normalized files:', normalizedFiles);
          const validFiles = validateFileSize(normalizedFiles);
          pickedFiles = validFiles;
          setAttachments(prev => [...prev, ...validFiles]);
          
          if (validFiles.length > 0) {
            Alert.alert('Success', `${validFiles.length} image(s) selected successfully!`);
          }
        }
      } else if (type === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setAttaching(false); return []; }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
        if (!result.canceled) {
          pickedFiles = result.assets.map(normalize);
          setAttachments(prev => [...prev, ...pickedFiles]);
        }
      } else if (type === 'video') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { setAttaching(false); return []; }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsMultipleSelection: true,
          selectionLimit: 5, // Allow up to 5 videos at once
          quality: 0.8,
        });
        if (!result.canceled) {
          const normalizedFiles = result.assets.map(normalize);
          const validFiles = validateFileSize(normalizedFiles);
          pickedFiles = validFiles;
          setAttachments(prev => [...prev, ...validFiles]);
          
          if (validFiles.length > 0) {
            Alert.alert('Success', `${validFiles.length} video(s) selected successfully!`);
          }
        }
      } else if (type === 'document') {
        result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          type: "*/*",
          multiple: true, // Enable multiple document selection
        });
        // console.log('DocumentPicker result:', result);
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          // New API: multiple files in assets array
          const normalizedFiles = result.assets.map(normalize);
          const validFiles = validateFileSize(normalizedFiles);
          pickedFiles = validFiles;
          setAttachments(prev => [...prev, ...validFiles]);
          
          if (validFiles.length > 0) {
            Alert.alert('Success', `${validFiles.length} document(s) selected successfully!`);
          }
        } else if (result.type === 'success' && result.uri) {
          // Fallback for older API: single file
          const fileObj = normalize(result);
          const validFiles = validateFileSize([fileObj]);
          if (validFiles.length > 0) {
            pickedFiles = validFiles;
            setAttachments(prev => [...prev, ...validFiles]);
            Alert.alert('Success', 'Document selected successfully!');
          }
        }
      }
      setAttaching(false);
      return pickedFiles; // <-- always return picked files array
    } catch (err) {
      setAttaching(false);
      Alert.alert('Attachment Error', err.message || 'Failed to pick attachment');
      return [];
    }
  };

  const clearAttachments = () => setAttachments([]);

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalSize = () => {
    return attachments.reduce((total, file) => total + (file.size || 0), 0);
  };

  const getFormattedSize = (bytes, isExisting = false) => {
    if (!bytes || bytes === 0) {
      return isExisting ? 'Existing file' : 'Unknown size';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (file) => {
    if (!file || !file.type) {
      // Fallback to file extension if type is not available
      const extension = (file?.name || file?.uri || '').toLowerCase().split('.').pop();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'bmp':
          return 'image';
        case 'mp4':
        case 'mov':
        case 'avi':
        case 'wmv':
        case 'flv':
          return 'video';
        case 'mp3':
        case 'wav':
        case 'm4a':
        case 'aac':
        case 'ogg':
          return 'audio';
        case 'pdf':
          return 'pdf';
        case 'doc':
        case 'docx':
          return 'document';
        case 'xls':
        case 'xlsx':
          return 'spreadsheet';
        case 'ppt':
        case 'pptx':
          return 'presentation';
        default:
          return 'file';
      }
    }
    
    // Handle both full MIME types and simplified types
    if (file.type === 'image' || file.type.startsWith('image/')) return 'image';
    if (file.type === 'video' || file.type.startsWith('video/')) return 'video';
    if (file.type === 'audio' || file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'pdf' || file.type.includes('pdf')) return 'pdf';
    if (file.type.includes('document') || file.type.includes('word')) return 'document';
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'spreadsheet';
    if (file.type.includes('presentation') || file.type.includes('powerpoint')) return 'presentation';
    return 'file';
  };

  const isPreviewable = (file) => {
    const type = getFileType(file);
    return ['image', 'pdf'].includes(type);
  };

  const getFileIcon = (file) => {
    const type = getFileType(file);
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'video';
      case 'audio': return 'music';
      case 'pdf': return 'file-text';
      case 'document': return 'file-text';
      case 'spreadsheet': return 'grid';
      case 'presentation': return 'monitor';
      default: return 'file';
    }
  };

  return { 
    attachments, 
    pickAttachment, 
    clearAttachments, 
    removeAttachment,
    setAttachments, 
    attaching,
    getTotalSize,
    getFormattedSize,
    getFileType,
    isPreviewable,
    getFileIcon
  };
}
