import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export default function Emergency() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { isOnline } = useNetworkStatus();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);

  // Force refetch on screen focus
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get reminder settings (allow offline access via cache)
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !authLoading && refreshTrigger !== -1 ? {} : "skip"
  );

  // Get user profile with emergency contact (allow offline access via cache)
  const profile = useQuery(
    (api as any)["profile/personalInformation"].getProfile,
    isAuthenticated && !authLoading && refreshTrigger !== -1 ? {} : "skip"
  );

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setRefreshTrigger(prev => prev + 1);
    }, [])
  );

  // Function to handle emergency calls
  const handleEmergencyCall = (number: string) => {
    const cleanNumber = number.replace(/[^0-9+]/g, "");

    // For 911, show immediate confirmation with clear cancel option
    if (cleanNumber === "911") {
      setModalTitle("Call 911 Emergency?");
      setModalMessage("You are about to call emergency services (911). This should only be used for life-threatening emergencies.\n\nCall 911 if:\n• Someone's life is in danger\n• Medical emergency requiring immediate attention\n• Fire or serious accident\n\nFor non-emergencies, use Health Link 811 instead.");
      setModalButtons([
        {
          label: "Cancel",
          onPress: () => setModalVisible(false),
          variant: 'secondary'
        },
        {
          label: "Call 911 Now",
          onPress: () => {
            setModalVisible(false);
            Linking.openURL(`tel:${cleanNumber}`).catch(() => {
              setModalTitle("Error");
              setModalMessage("Could not make the call. Please check your device.");
              setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
              setModalVisible(true);
            });
          },
          variant: 'destructive'
        },
      ]);
      setModalVisible(true);
      return;
    }

    // For 811, show confirmation with health advice context
    if (cleanNumber === "811") {
      setModalTitle("Call Health Link 811?");
      setModalMessage("You are about to call Health Link Alberta (811) for 24/7 health advice from registered nurses.\n\nUse 811 for:\n• Health questions and concerns\n• Advice on medications\n• Help deciding if you need to see a doctor\n• Finding health services in your area\n\nThis is a free service available 24 hours a day.");
      setModalButtons([
        {
          label: "Cancel",
          onPress: () => setModalVisible(false),
          variant: 'secondary'
        },
        {
          label: "Call 811",
          onPress: () => {
            setModalVisible(false);
            Linking.openURL(`tel:${cleanNumber}`).catch(() => {
              setModalTitle("Error");
              setModalMessage("Could not make the call. Please check your device.");
              setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
              setModalVisible(true);
            });
          },
          variant: 'primary'
        },
      ]);
      setModalVisible(true);
      return;
    }

    // For other numbers (personal contact), proceed directly
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      setModalTitle("Error");
      setModalMessage("Could not make the call. Please check your device.");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={120} />

        {/* Fixed Header (not scrollable) */}
        <CurvedHeader
          title="Emergency"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminderSettings?.enabled || false}
          reminderSettings={reminderSettings || null}
        />

        {/* Emergency Contacts - Centered, focused layout */}
        <View style={styles.contentArea}>
          <View style={styles.emergencyContent}>
            {/* Emergency message */}
            <Text style={styles.emergencyTitle}>Emergency Services</Text>
            <Text style={styles.emergencySubtitle}>
              For life-threatening emergencies only
            </Text>

            {/* Primary: 911 */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleEmergencyCall("911")}
              activeOpacity={0.85}
            >
              <Icon name="add-box" size={24} color="#B91C1C" />
              <Text style={styles.primaryButtonText}>Call 911</Text>
            </TouchableOpacity>

            {/* Secondary contacts */}
            <View style={styles.secondarySection}>
              <Text style={styles.secondarySectionTitle}>Other contacts</Text>

              <View style={styles.secondaryRow}>
                {/* 811 Health Link */}
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => handleEmergencyCall("811")}
                  activeOpacity={0.8}
                >
                  <Icon name="healing" size={20} color="#64748B" />
                  <View style={styles.secondaryButtonContent}>
                    <Text style={styles.secondaryButtonText}>811</Text>
                    <Text style={styles.secondaryButtonLabel}>Health Link</Text>
                  </View>
                </TouchableOpacity>

                {/* Personal Emergency Contact */}
                {profile?.emergencyContactName && profile?.emergencyContactPhone && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleEmergencyCall(profile.emergencyContactPhone!)}
                    activeOpacity={0.8}
                  >
                    <Icon name="person" size={20} color="#64748B" />
                    <View style={styles.secondaryButtonContent}>
                      <Text style={styles.secondaryButtonText} numberOfLines={1}>
                        {profile.emergencyContactName.split(' ')[0]}
                      </Text>
                      <Text style={styles.secondaryButtonLabel}>Personal</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Find Care link - subtle text link */}
            <TouchableOpacity
              style={styles.findCareLink}
              onPress={() => router.push('/find-care/clinics')}
              activeOpacity={0.6}
            >
              <Text style={styles.findCareLinkText}>Looking for a clinic?</Text>
              <Text style={styles.findCareLinkAction}>Find Care</Text>
              <Icon name="chevron-right" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </CurvedBackground>
      <BottomNavigation floating={true} />

      {/* Modal for alerts and confirmations */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtonRow}>
              {(modalButtons.length ? modalButtons : [{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]).map((b, idx) => {
                const isSecondary = b.variant === 'secondary';
                const isDestructive = b.variant === 'destructive';
                const backgroundColor = isSecondary ? COLORS.white : (isDestructive ? COLORS.error : COLORS.primary);
                const textColor = isSecondary ? COLORS.primary : COLORS.white;
                const borderStyle = isSecondary ? { borderWidth: 1, borderColor: COLORS.primary } : {};
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={b.onPress}
                    style={[
                      styles.modalButton,
                      { backgroundColor },
                      modalButtons.length > 1 ? { flex: 1 } : { paddingHorizontal: 18 },
                      borderStyle as any,
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: textColor }]}>{b.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
  },
  emergencyContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emergencyTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 28,
    color: '#1E293B',
    marginBottom: 8,
  },
  emergencySubtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
  },
  // Primary button: 911 - subtle shadow, muted border
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 32,
    gap: 10,
    marginBottom: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  primaryButtonText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 22,
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  // Secondary section
  secondarySection: {
    alignItems: 'center',
    width: '100%',
  },
  secondarySectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  // Secondary row for 811 and personal contact
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  // Secondary buttons: card style, muted
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    minWidth: 140,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  secondaryButtonContent: {
    alignItems: 'flex-start',
  },
  secondaryButtonText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: '#334155',
  },
  secondaryButtonLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: '#94A3B8',
  },
  // Find Care link - subtle text style
  findCareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  findCareLinkText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: '#94A3B8',
  },
  findCareLinkAction: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
    marginBottom: 8,
  },
  modalMessage: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
});
