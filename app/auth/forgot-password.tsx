import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import CurvedBackground from '../components/curvedBackground';
import CurvedHeader from '../components/curvedHeader';
import { COLORS, FONTS } from '../constants/constants';

// Validation schemas for each step
const EmailSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
});

const ResetSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email is required'),
  code: Yup.string()
    .trim()
    .required('Verification code is required'),
  newPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required'),
});

export default function ForgotPassword() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot");
  const [showPassword, setShowPassword] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);

  const handleSendCode = async (email: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('flow', 'reset');
      
      await signIn("password", formData);
      
      setModalTitle('✉️ Verification Code Sent');
      setModalMessage('A 6-digit verification code has been sent to your email. Please check your inbox and spam folder. The code will expire in 10 minutes.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
      
      setStep({ email });
    } catch (error) {
      console.error('Failed to send verification code:', error);
      setModalTitle('Error');
      setModalMessage('Failed to send verification code. Please try again.');
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string, code: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('code', code);
      formData.append('newPassword', newPassword);
      formData.append('flow', 'reset-verification');
      
      await signIn("password", formData);
      
      setModalTitle('✅ Password Reset Successful');
      setModalMessage('Your password has been successfully reset. You can now sign in with your new password.');
      setModalButtons([
        {
          label: 'OK',
          onPress: () => {
            setModalVisible(false);
            router.back();
          },
          variant: 'primary'
        }
      ]);
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to reset password:', error);
      // Extract user-friendly message from error
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid') && (msg.includes('code') || msg.includes('verification'))) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (msg.includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        }
      }
      
      setModalTitle('Error');
      setModalMessage(errorMessage);
      setModalButtons([{ label: 'OK', onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <CurvedHeader
              title="Alberta Health Connect"
              height={150}
              showLogo={true}
            />

            <View style={styles.contentSection}>
              <Text style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Forgot Password
              </Text>
              <Text style={[styles.subtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                {step !== "forgot"
                  ? 'Enter the verification code sent to your email and set a new password'
                  : 'Enter your email address to receive a verification code'}
              </Text>

              <Formik
                initialValues={{ email: step !== "forgot" ? step.email : '', code: '', newPassword: '' }}
                validationSchema={step !== "forgot" ? ResetSchema : EmailSchema}
                enableReinitialize
                onSubmit={(values) => {
                  if (step !== "forgot") {
                    handleResetPassword(values.email, values.code, values.newPassword);
                  } else {
                    handleSendCode(values.email);
                  }
                }}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View style={styles.formContainer}>
                    {step === "forgot" ? (
                      <>
                        <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Email
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                            errors.email && touched.email && styles.inputError
                          ]}
                          placeholder="Enter your email"
                          placeholderTextColor="#999"
                          value={values.email}
                          onChangeText={(text) => handleChange('email')(text.trim())}
                          onBlur={handleBlur('email')}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        {errors.email && touched.email && (
                          <Text style={styles.errorText}>{errors.email}</Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Verification Code
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                            errors.code && touched.code && styles.inputError
                          ]}
                          placeholder="Enter verification code"
                          placeholderTextColor="#999"
                          value={values.code}
                          onChangeText={handleChange('code')}
                          onBlur={handleBlur('code')}
                          keyboardType="numeric"
                        />
                        {errors.code && touched.code && (
                          <Text style={styles.errorText}>{errors.code}</Text>
                        )}

                        <Text style={[styles.label, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          New Password
                        </Text>
                        <View style={styles.passwordContainer}>
                          <TextInput
                            style={[
                              styles.passwordInput,
                              { fontFamily: FONTS.BarlowSemiCondensed, color: '#1A1A1A' },
                              errors.newPassword && touched.newPassword && styles.inputError
                            ]}
                            placeholder="Enter new password"
                            placeholderTextColor="#999"
                            value={values.newPassword}
                            onChangeText={handleChange('newPassword')}
                            onBlur={handleBlur('newPassword')}
                            secureTextEntry={!showPassword}
                          />
                          <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                          >
                            <Ionicons
                              name={showPassword ? 'eye-off' : 'eye'}
                              size={24}
                              color="#666"
                            />
                          </TouchableOpacity>
                        </View>
                        {errors.newPassword && touched.newPassword && (
                          <Text style={styles.errorText}>{errors.newPassword}</Text>
                        )}
                      </>
                    )}

                    <TouchableOpacity
                      style={[styles.button, isLoading && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      disabled={isLoading}
                    >
                      <Text style={[styles.buttonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {isLoading
                          ? step !== "forgot"
                            ? 'Resetting Password...'
                            : 'Sending Code...'
                          : step !== "forgot"
                            ? 'Reset Password'
                            : 'Send Verification Code'}
                      </Text>
                    </TouchableOpacity>

                    {step !== "forgot" && (
                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setStep("forgot")}
                      >
                        <Text style={[styles.backButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Request New Code
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => router.back()}
                    >
                      <Text style={[styles.backButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Back to Sign In
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Formik>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>

      {/* Modal for alerts and confirmations */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
        }}>
          <View style={{
            width: '80%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8
          }}>
            <Text style={{ fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 18, color: COLORS.darkText, marginBottom: 8 }}>{modalTitle}</Text>
            <Text style={{ fontFamily: FONTS.BarlowSemiCondensed, fontSize: 14, color: COLORS.darkGray, marginBottom: 16 }}>{modalMessage}</Text>
            <View style={{ flexDirection: 'row', justifyContent: modalButtons.length > 1 ? 'space-between' : 'center', gap: 12 }}>
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
                    style={{
                      backgroundColor,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: 'center',
                      flex: modalButtons.length > 1 ? 1 : undefined,
                      paddingHorizontal: modalButtons.length > 1 ? 0 : 18,
                      ...borderStyle as any,
                    }}
                  >
                    <Text style={{ color: textColor, fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 16 }}>{b.label}</Text>
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
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    color: '#1A1A1A',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    paddingRight: 50,
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginBottom: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  button: {
    backgroundColor: '#2A7DE1',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9ec5f0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: '#2A7DE1',
    fontWeight: '600',
    marginTop: 8,
  },
});