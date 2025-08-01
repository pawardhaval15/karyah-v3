import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DateBox({ label, value, onChange, theme }) {
//   console.log('[DateBox] Render label:', label, 'value:', value);

  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const parsedDate = value ? new Date(value) : new Date();

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate) {
        onChange(selectedDate);
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  return (
    <View style={styles.centeredWrapper}>
      <TouchableOpacity
        style={[
          styles.dateBox,
          { backgroundColor: theme.secCard, borderWidth: 1, borderColor: theme.inputBox },
        ]}
        onPress={() => {
          setTempDate(parsedDate);
          setShow(true);
        }}>
        <Ionicons name="calendar-outline" size={20} color={theme.text} style={{ marginRight: 6 }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.dateLabel, { color: theme.secondaryText }]}>{label}</Text>
          <Text style={[styles.dateValue, { color: theme.text }]}>
            {parsedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>

      {Platform.OS === 'ios' && show && (
        <Modal transparent animationType="slide" visible={show}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShow(false)}
            />
            <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
                textColor={theme.text}
                style={{ backgroundColor: theme.card }}
              />
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                  paddingHorizontal: 32,
                  paddingVertical: 10,
                }}
                onPress={() => {
                  setShow(false);
                  onChange(tempDate);
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && show && (
        <DateTimePicker value={parsedDate} mode="date" display="default" onChange={handleChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centeredWrapper: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
    justifyContent: 'center',
    minWidth: 100,
    width: '100%',
  },
  dateLabel: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  dateValue: {
    color: '#222',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
  },
});
