import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Feather } from '@expo/vector-icons';

export function FullscreenImageModal({ visible, uri, onClose, theme }) {
  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
        >
          <Feather name="x" size={32} color="#fff" />
        </TouchableOpacity>
        <ImageViewer
          imageUrls={[{ url: uri }]}
          backgroundColor="black"
          enableSwipeDown
          onSwipeDown={onClose}
          useNativeDriver
          renderIndicator={() => null}
          saveToLocalByLongPress={false}
        />
      </View>
    </Modal>
  );
}
