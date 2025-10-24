import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const COLORS = {
  primary: '#00695C',
  primaryDark: '#004D40',
  white: '#FFFFFF',
  darkText: '#1A1A1A',
  darkGray: '#666666',
  lightGray: '#E0E0E0',
  background: '#F5F5F5',
  overlay: 'rgba(0,0,0,0.5)',
};

interface TimePickerModalProps {
  visible: boolean;
  value: string; // HH:MM format (24-hour)
  onSelect: (time: string) => void;
  onCancel: () => void;
  title?: string;
}

export default function TimePickerModal({
  visible,
  value,
  onSelect,
  onCancel,
  title = 'Select Time',
}: TimePickerModalProps) {
  // Parse HH:MM to Date
  const [hh, mm] = value.split(':').map(Number);
  const initialDate = new Date();
  initialDate.setHours(hh || 9, mm || 0, 0, 0);
  
  const [tempDate, setTempDate] = useState(initialDate);

  const handleConfirm = () => {
    const hours = String(tempDate.getHours()).padStart(2, '0');
    const minutes = String(tempDate.getMinutes()).padStart(2, '0');
    onSelect(`${hours}:${minutes}`);
  };

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (selectedDate) {
        setTempDate(selectedDate);
        const hours = String(selectedDate.getHours()).padStart(2, '0');
        const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
        onSelect(`${hours}:${minutes}`);
      } else {
        onCancel();
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  if (Platform.OS === 'android' && visible) {
    return (
      <DateTimePicker
        value={tempDate}
        mode="time"
        is24Hour={false}
        display="default"
        onChange={handleChange}
      />
    );
  }

  if (Platform.OS === 'android') {
    return null;
  }

  // iOS modal with smooth curves
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Curved header */}
          <View style={styles.headerCurve}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          
          {/* Picker section with subtle curve */}
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={tempDate}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={handleChange}
              textColor={COLORS.darkText}
              style={styles.picker}
            />
          </View>

          {/* Button row with curved buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  headerCurve: {
    backgroundColor: COLORS.primary,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pickerContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  picker: {
    height: 180,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.darkGray,
    letterSpacing: 0.3,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
