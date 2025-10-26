/**
 * StatusModal - Reusable modal component for displaying success/error messages
 * Replaces Alert.alert() and custom modals with a consistent, theme-aware modal UI
 */
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, FONTS } from '../constants/constants';

interface StatusModalButton {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

interface StatusModalProps {
  visible: boolean;
  type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  title: string;
  message: string;
  onClose?: () => void;
  buttons?: StatusModalButton[];
  icon?: string;
}

export default function StatusModal({
  visible,
  type = 'info',
  title,
  message,
  onClose,
  buttons,
  icon,
}: StatusModalProps) {
  
  const defaultButtons: StatusModalButton[] = buttons || [
    {
      label: 'OK',
      onPress: onClose || (() => {}),
      variant: 'primary',
    },
  ];

  const isManyButtons = defaultButtons.length > 2;

  const getIconName = () => {
    if (icon) return icon;
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'confirm':
        return 'help';
      case 'info':
      default:
        return 'info';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return COLORS.error;
      case 'warning':
        return '#FF9800';
      case 'confirm':
        return COLORS.primary;
      case 'info':
      default:
        return COLORS.primary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <Icon name={getIconName()} size={64} color={getIconColor()} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View
            style={[
              styles.buttonContainer,
              defaultButtons.length > 1 && !isManyButtons && styles.buttonContainerRow,
              isManyButtons && styles.buttonContainerColumn,
            ]}
          >
            {defaultButtons.map((button, index) => {
              const isSecondary = button.variant === 'secondary';
              const isDestructive = button.variant === 'destructive';
              const backgroundColor = isSecondary 
                ? COLORS.white 
                : (isDestructive ? COLORS.error : COLORS.primary);
              const textColor = isSecondary ? COLORS.primary : COLORS.white;
              const borderStyle = isSecondary 
                ? { borderWidth: 2, borderColor: COLORS.primary } 
                : {};

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    { backgroundColor },
                    borderStyle,
                    defaultButtons.length > 1 && !isManyButtons && styles.buttonFlex,
                    isManyButtons && styles.buttonFullWidth,
                  ]}
                  onPress={button.onPress}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>
                    {button.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    color: COLORS.darkText,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 15,
    fontFamily: FONTS.BarlowSemiCondensed,
    textAlign: 'center',
    marginBottom: 24,
    color: COLORS.darkGray,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  buttonContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonContainerColumn: {
    flexDirection: 'column',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    letterSpacing: 0.5,
  },
});
