import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function PrivacyPolicyModal({ navigation }) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(true);

  const handleAgree = () => {
    setModalVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <Modal visible={modalVisible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.heading, { color: theme.text }]}>Privacy Policy</Text>
            <Text style={[styles.subHeading, { color: theme.text }]}>
              Effective Date: January 2025
            </Text>

            <Text style={[styles.paragraph, { color: theme.text }]}>
              Welcome to Karyah! This Privacy Policy explains how we collect, use, and protect your personal information when you use our application.
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Information We Collect</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              - Personal information (name, email address, phone number)
              {'\n'}- Task and project information you enter in the app
              {'\n'}- Device information and usage statistics
              {'\n'}- Location data (with your permission)
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>How We Use Your Information</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              - Provide, maintain, and improve our services
              {'\n'}- Communicate with you about your account
              {'\n'}- Develop new features based on user behavior
              {'\n'}- Protect against fraudulent or unauthorized activity
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Information Sharing</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              We do not sell your personal information. We may share information with:
              {'\n'}- Service providers who help operate our app
              {'\n'}- Law enforcement when required by law
              {'\n'}- Business partners with your consent
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Security</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              We implement reasonable security measures to protect your information from unauthorized access or disclosure.
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rights</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              - Access your personal information
              {'\n'}- Correct inaccurate information
              {'\n'}- Delete your account and data
              {'\n'}- Opt out of marketing communications
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Children's Privacy</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              Our services are not intended for children under the age of 13.
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Changes to This Policy</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              We may update this Privacy Policy from time to time. We will notify you of any significant changes.
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Us</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              If you have questions about this Privacy Policy, please contact us at: support@karyah.com
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[styles.agreeButton, { backgroundColor: theme.primary }]}
            onPress={handleAgree}
            activeOpacity={0.8}
          >
            <Text style={styles.agreeButtonText}>Agree</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000AA', // semi-transparent backdrop
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 14,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
  agreeButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
