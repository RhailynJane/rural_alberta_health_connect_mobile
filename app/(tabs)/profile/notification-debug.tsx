import * as Notifications from 'expo-notifications';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
    getAllScheduledNotifications,
    getNotificationDiagnostics,
    initializeNotificationsOnce,
    requestNotificationPermissions,
    scheduleAllReminderItems
} from '../../_utils/notifications';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { COLORS, FONTS } from '../../constants/constants';

export default function NotificationDebugScreen() {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [scheduled, setScheduled] = useState<any[]>([]);

  const checkDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Checking notification diagnostics...');
      const diag = await getNotificationDiagnostics();
      setDiagnostics(diag);
      console.log('📊 Diagnostics:', diag);

      // Also check scheduled notifications
      const sched = await getAllScheduledNotifications();
      setScheduled(sched || []);
      console.log('📅 Scheduled notifications:', sched);

      Alert.alert(
        '✅ Diagnostics Collected',
        `Notifications configured: ${diag.hasScheduleAsync ? 'Yes' : 'No'}\nScheduled: ${sched?.length || 0} notifications`,
      );
    } catch (err) {
      console.error('❌ Error checking diagnostics:', err);
      Alert.alert('❌ Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    setLoading(true);
    try {
      console.log('🔐 Checking permissions...');
      const granted = await requestNotificationPermissions();
      Alert.alert(
        '🔐 Permissions',
        granted ? '✅ Notification permissions GRANTED' : '❌ Permissions NOT granted',
      );
    } catch (err) {
      console.error('❌ Error checking permissions:', err);
      Alert.alert('❌ Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const reinitialize = async () => {
    setLoading(true);
    try {
      console.log('🔄 Reinitializing notifications...');
      await initializeNotificationsOnce();
      Alert.alert('✅ Reinitialized', 'Notification handlers re-registered');
    } catch (err) {
      console.error('❌ Error reinitializing:', err);
      Alert.alert('❌ Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const forceReschedule = async () => {
    setLoading(true);
    try {
      console.log('⚡ Force rescheduling all reminders...');
      await scheduleAllReminderItems();
      
      // Refresh diagnostics to show newly scheduled notifications
      const sched = await getAllScheduledNotifications();
      setScheduled(sched || []);
      console.log('📅 After reschedule:', sched);
      
      Alert.alert(
        '✅ Reminders Rescheduled',
        `${sched?.length || 0} notifications now scheduled`,
      );
    } catch (err) {
      console.error('❌ Error rescheduling:', err);
      Alert.alert('❌ Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setLoading(true);
    try {
      console.log('🧪 Scheduling test notification in 5 seconds...');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from the debug screen!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: 5,
          channelId: 'reminders-high',
        },
      });
      
      Alert.alert(
        '✅ Test Scheduled',
        'A test notification will appear in 5 seconds. Keep the app open or minimize it to test.',
      );
    } catch (err) {
      console.error('❌ Error sending test:', err);
      Alert.alert('❌ Error', String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <CurvedBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <CurvedHeader
          title="Notification Debug"
          height={120}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={false}
        />

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Action Buttons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛠️ Diagnostics Tools</Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryBtn]}
              onPress={checkDiagnostics}
              disabled={loading}
            >
              <Icon name="info" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Check Diagnostics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryBtn]}
              onPress={checkPermissions}
              disabled={loading}
            >
              <Icon name="security" size={20} color={COLORS.primary} />
              <Text style={[styles.buttonText, styles.secondaryBtnText]}>Check Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryBtn]}
              onPress={reinitialize}
              disabled={loading}
            >
              <Icon name="refresh" size={20} color={COLORS.primary} />
              <Text style={[styles.buttonText, styles.secondaryBtnText]}>Reinitialize</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.warningBtn]}
              onPress={forceReschedule}
              disabled={loading}
            >
              <Icon name="schedule" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Force Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.testBtn]}
              onPress={sendTestNotification}
              disabled={loading}
            >
              <Icon name="notifications-active" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Send Test Notification (5s)</Text>
            </TouchableOpacity>
          </View>

          {/* Diagnostics Results */}
          {diagnostics && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Diagnostics</Text>
              <View style={styles.resultBox}>
                <DiagnosticRow label="Module" value={diagnostics.moduleName} />
                <DiagnosticRow
                  label="Notification Handler"
                  value={diagnostics.hasNotificationHandler ? '✅' : '❌'}
                  color={diagnostics.hasNotificationHandler ? COLORS.success : COLORS.error}
                />
                <DiagnosticRow
                  label="Schedule Async"
                  value={diagnostics.hasScheduleAsync ? '✅' : '❌'}
                  color={diagnostics.hasScheduleAsync ? COLORS.success : COLORS.error}
                />
                <DiagnosticRow
                  label="Request Permissions"
                  value={diagnostics.hasRequestPermissions ? '✅' : '❌'}
                  color={diagnostics.hasRequestPermissions ? COLORS.success : COLORS.error}
                />
                <DiagnosticRow
                  label="Get Permissions"
                  value={diagnostics.hasGetPermissions ? '✅' : '❌'}
                  color={diagnostics.hasGetPermissions ? COLORS.success : COLORS.error}
                />
                <DiagnosticRow
                  label="Received Listener"
                  value={diagnostics.hasReceivedListener ? '✅' : '❌'}
                  color={diagnostics.hasReceivedListener ? COLORS.success : COLORS.error}
                />
                <DiagnosticRow
                  label="Response Listener"
                  value={diagnostics.hasResponseListener ? '✅' : '❌'}
                  color={diagnostics.hasResponseListener ? COLORS.success : COLORS.error}
                />
                <DiagnosticRow label="Channel ID" value={diagnostics.channelId} />
              </View>
            </View>
          )}

          {/* Scheduled Notifications */}
          {scheduled.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Scheduled Notifications ({scheduled.length})</Text>
              {scheduled.map((notif, idx) => (
                <View key={idx} style={styles.resultBox}>
                  <DiagnosticRow
                    label="Identifier"
                    value={notif.identifier?.substring(0, 20) + '...'}
                  />
                  <DiagnosticRow label="Title" value={notif.content?.title || 'N/A'} />
                  <DiagnosticRow label="Trigger Type" value={notif.trigger?.type || 'N/A'} />
                </View>
              ))}
            </View>
          )}

          {scheduled.length === 0 && diagnostics && (
            <View style={[styles.section, styles.warningBox]}>
              <Icon name="warning" size={32} color={COLORS.error} />
              <Text style={styles.warningText}>⚠️ No scheduled notifications found!</Text>
              <Text style={styles.warningSubtext}>
                Enable reminders in the Profile screen to schedule notifications.
              </Text>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 Instructions</Text>
            <View style={styles.instructionBox}>
              <InstructionStep num={1} text="Tap 'Check Diagnostics' to verify notification setup" />
              <InstructionStep num={2} text="Tap 'Check Permissions' to ensure permissions are granted" />
              <InstructionStep num={3} text="Go to Profile → Notifications and enable reminders" />
              <InstructionStep num={4} text="Check back here to see if notifications appear in the 'Scheduled' section" />
              <InstructionStep num={5} text="Check device logs (Xcode/Android Studio) for 🔔 emojis" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </CurvedBackground>
  );
}

function DiagnosticRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function InstructionStep({ num, text }: { num: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{num}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
    marginBottom: 12,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  warningBtn: {
    backgroundColor: '#FF9800',
  },
  testBtn: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtnText: {
    color: COLORS.primary,
  },
  resultBox: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  rowLabel: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  rowValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkText,
  },
  warningBox: {
    backgroundColor: COLORS.error + '15',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    alignItems: 'center',
  },
  warningText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.error,
    marginTop: 8,
    fontWeight: '600',
  },
  warningSubtext: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
    textAlign: 'center',
  },
  instructionBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 2,
  },
});
