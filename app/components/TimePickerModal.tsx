import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
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
  // Parse HH:MM to Date or create custom picker
  const [hh, mm] = value.split(':').map(Number);
  const initialDate = new Date();
  initialDate.setHours(hh || 9, mm || 0, 0, 0);
  
  const [tempDate, setTempDate] = useState(initialDate);
  
  // Custom picker state
  const [selectedHour, setSelectedHour] = useState(hh || 9);
  const [selectedMinute, setSelectedMinute] = useState(mm || 0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(hh >= 12 ? 'PM' : 'AM');

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    const timeString = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onSelect(timeString);
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

  // iOS - Custom smooth picker
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          
          <View style={styles.pickerContainer}>
            <View style={styles.pickerRow}>
              {/* Hour Picker */}
              <ScrollView 
                style={styles.pickerColumn}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerScrollContent}
              >
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      selectedHour === hour && styles.pickerItemSelected
                    ]}
                    onPress={() => setSelectedHour(hour)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pickerText,
                      selectedHour === hour && styles.pickerTextSelected
                    ]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.separator}>:</Text>

              {/* Minute Picker */}
              <ScrollView 
                style={styles.pickerColumn}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerScrollContent}
              >
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      selectedMinute === minute && styles.pickerItemSelected
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pickerText,
                      selectedMinute === minute && styles.pickerTextSelected
                    ]}>
                      {String(minute).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* AM/PM Picker */}
              <View style={styles.periodColumn}>
                {['AM', 'PM'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodItem,
                      selectedPeriod === period && styles.periodItemSelected
                    ]}
                    onPress={() => setSelectedPeriod(period as 'AM' | 'PM')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.periodText,
                      selectedPeriod === period && styles.periodTextSelected
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              activeOpacity={0.7}
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkText,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  pickerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickerColumn: {
    flex: 1,
    maxHeight: 200,
  },
  pickerScrollContent: {
    paddingVertical: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primary,
  },
  pickerText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.darkText,
  },
  pickerTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  separator: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.darkText,
    marginHorizontal: 4,
  },
  periodColumn: {
    width: 70,
    gap: 8,
  },
  periodItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  periodItemSelected: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  periodTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
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
