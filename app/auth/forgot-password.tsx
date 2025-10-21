import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import CurvedBackground from '../components/curvedBackground';
import CurvedHeader from '../components/curvedHeader';
import { FONTS } from '../constants/constants';

// Validation schema
const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  code: Yup.string()
    .when('showCodeField', {
      is: true,
      then: (schema) => schema.required('Verification code is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
  newPassword: Yup.string()
    .when('showCodeField', {
      is: true,
      then: (schema) => schema
        .min(6, 'Password must be at least 6 characters')
        .required('New password is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
});

export default function ForgotPassword() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeField, setShowCodeField] = useState(false);

  const handleSendCode = async (email: string) => {
    setIsLoading(true);
    try {
      // Simulate API call to send verification code
      console.log('Sending verification code to:', email);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      Alert.alert(
        'Code Sent',
        'A verification code has been sent to your email address.',
        [{ text: 'OK' }]
      );
      
      setShowCodeField(true);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      Alert.alert(
        'Error',
        'Failed to send verification code. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string, code: string, newPassword: string) => {
    setIsLoading(true);
    try {
      // Simulate API call to reset password
      console.log('Resetting password for:', email, 'with code:', code);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      Alert.alert(
        'Password Reset',
        'Your password has been successfully reset. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          }
        ]
      );
    } catch (error) {
      console.error('Failed to reset password:', error);
      Alert.alert(
        'Error',
        'Failed to reset password. Please check the verification code and try again.',
        [{ text: 'OK' }]
      );
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
                {showCodeField
                  ? 'Enter the verification code sent to your email and set a new password'
                  : 'Enter your email address to receive a verification code'}
              </Text>

              <Formik
                initialValues={{ email: '', code: '', newPassword: '', showCodeField }}
                validationSchema={ForgotPasswordSchema}
                onSubmit={(values) => {
                  if (showCodeField) {
                    handleResetPassword(values.email, values.code, values.newPassword);
                  } else {
                    handleSendCode(values.email);
                  }
                }}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View style={styles.formContainer}>
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
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!showCodeField}
                    />
                    {errors.email && touched.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}

                    {showCodeField && (
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
                        <TextInput
                          style={[
                            styles.input,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                            errors.newPassword && touched.newPassword && styles.inputError
                          ]}
                          placeholder="Enter new password"
                          placeholderTextColor="#999"
                          value={values.newPassword}
                          onChangeText={handleChange('newPassword')}
                          onBlur={handleBlur('newPassword')}
                          secureTextEntry
                        />
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
                          ? showCodeField
                            ? 'Resetting Password...'
                            : 'Sending Code...'
                          : showCodeField
                            ? 'Reset Password'
                            : 'Send Verification Code'}
                      </Text>
                    </TouchableOpacity>

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
  },
});