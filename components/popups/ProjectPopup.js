import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProjectDrawerForm from '../Project/ProjectDrawerForm';


export default function ProjectPopup({ visible, onClose, values, onChange, onSubmit, theme }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.popup, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[{ fontSize: 18, fontWeight: '500', color: theme.text }]}>Create New Project</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ProjectDrawerForm
            values={values}
            onChange={onChange}
            onSubmit={() => { onSubmit(); onClose(); }}
            hideSimpleForm
            theme={theme}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '92%',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 18,
    maxHeight: '85%',
    minHeight: 320,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
});