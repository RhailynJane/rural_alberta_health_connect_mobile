import { LinearGradient } from "expo-linear-gradient";
import React from 'react';
import { TimerPickerModal } from "react-native-timer-picker";

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
  // Parse HH:MM to hours and minutes
  const [hh, mm] = value.split(':').map(Number);
  
  // Convert 24-hour to 12-hour format for initial value
  const hours12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;

  const handleConfirm = (pickedDuration: { hours?: number; minutes?: number; seconds?: number }) => {
    const hours = pickedDuration.hours || 0;
    const minutes = pickedDuration.minutes || 0;
    
    // Format as HH:MM in 24-hour format
    const hours24 = String(hours).padStart(2, '0');
    const minutes24 = String(minutes).padStart(2, '0');
    onSelect(`${hours24}:${minutes24}`);
  };

  return (
    <TimerPickerModal
      visible={visible}
      setIsVisible={(isVisible) => {
        if (!isVisible) {
          onCancel();
        }
      }}
      onConfirm={handleConfirm}
      modalTitle={title}
      onCancel={onCancel}
      closeOnOverlayPress
      use12HourPicker
      hideSeconds
      initialValue={{
        hours: hours12,
        minutes: mm || 0,
      }}
      LinearGradient={LinearGradient}
      styles={{
        theme: "light",
        backgroundColor: COLORS.white,
        pickerItem: {
          fontSize: 32,
          fontWeight: '600',
        },
        pickerLabel: {
          fontSize: 24,
          fontWeight: '600',
        },
        pickerItemContainer: {
          width: 100,
        },
        pickerLabelContainer: {
          width: 60,
        },
        confirmButton: {
          color: COLORS.primary,
          fontSize: 18,
          fontWeight: '700',
        },
        cancelButton: {
          color: COLORS.darkGray,
          fontSize: 18,
          fontWeight: '600',
        },
        modalTitle: {
          fontSize: 20,
          fontWeight: '700',
          color: COLORS.darkText,
        },
        contentContainer: {
          paddingVertical: 20,
        },
      }}
      modalProps={{
        overlayOpacity: 0.3,
      }}
    />
  );
}
