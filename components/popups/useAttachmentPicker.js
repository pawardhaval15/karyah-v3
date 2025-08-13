import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';

export default function useAttachmentPicker() {
  const [attachments, setAttachments] = useState([]);
  const [attaching, setAttaching] = useState(false);

  const normalize = (file) => ({
    uri: file.uri,
    name: file.name || file.fileName || file.uri?.split('/').pop(),
    type: file.mimeType || file.type || 'application/octet-stream',
    size: file.size || 0,
    isExisting: false,
  });

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
          const normalizedFiles = result.assets.map(normalize);
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

  const getFormattedSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return { 
    attachments, 
    pickAttachment, 
    clearAttachments, 
    removeAttachment,
    setAttachments, 
    attaching,
    getTotalSize,
    getFormattedSize
  };
}
