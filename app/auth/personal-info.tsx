import { useDatabase } from "@nozbe/watermelondb/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { MAPBOX_ACCESS_TOKEN } from "../_config/mapbox.config";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { getPhoneSecurely, normalizeNanpToE164, savePhoneSecurely } from "../utils/securePhone";

export default function PersonalInfo() {
  const router = useRouter();
  const database = useDatabase();
  const { isAuthenticated } = useConvexAuth();
  const { isOnline } = useNetworkStatus();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Address suggestions state
  const [addressSuggestions, setAddressSuggestions] = useState<{
    id: string;
    label: string;
    address1: string;
    city?: string;
    province?: string;
    postalCode?: string;
  }[]>([]);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const latestAddressQueryTsRef = useRef<number>(0);

  const updatePersonalInfo = useMutation(
    api.personalInfoOnboarding.update.withAgeRangeAndLocation
  );
  const updatePhone = useMutation(api.users.updatePhone);

  // Format phone as (XXX) XXX-XXXX with a hard cap of 10 digits (display only)
  const formatPhoneInput = (input: string) => {
    let digits = (input || "").replace(/\D/g, "");
    if (digits.length > 10) digits = digits.slice(-10);
    const len = digits.length;
    if (len === 0) return "";
    if (len < 4) return `(${digits}`;
    if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Prefill phone if available from server
  React.useEffect(() => {
    if (currentUser?.phone && !phone) {
      setPhone(formatPhoneInput(currentUser.phone));
    }
  }, [currentUser?.phone, phone]);

  // Prefill from secure storage when offline or when server has no phone
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (phone) return;
      const shouldTrySecure = !isOnline || !currentUser?.phone;
      if (!shouldTrySecure) return;
      try {
        const uid = currentUser?._id ? String(currentUser._id) : undefined;
        if (!uid) return; // don't read legacy/global entry to avoid cross-account prefill
        const stored = await getPhoneSecurely(uid);
        if (!cancelled && stored && !phone) {
          setPhone(formatPhoneInput(stored));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isOnline, currentUser?._id, currentUser?.phone, phone]);

  // Validation logic
  const validateField = (field: string, raw: string): boolean => {
    const value = (raw || '').trim();
    let error = '';
    switch (field) {
      case 'phone': {
        if (value.length === 0) {
          error = 'Phone number is required';
          break;
        }
        const digits = value.replace(/\D+/g, '');
        if (digits.length !== 10) {
          error = 'Enter a valid 10-digit phone number';
        }
        break;
      }
      case 'age': {
        if (value.length === 0) {
          error = 'Age is required';
          break;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 120) error = 'Age must be between 0 and 120';
        break;
      }
      case 'address1': {
        if (value.length === 0) error = 'Address is required';
        break;
      }
      case 'city': {
        if (value.length === 0) error = 'City is required';
        break;
      }
      case 'province': {
        if (value.length === 0) {
          error = 'Province is required';
        } else {
          const allowed = ['AB','Alberta'];
          if (!allowed.includes(value)) {
            error = 'Use "Alberta" or "AB"';
          }
        }
        break;
      }
      case 'postalCode': {
        if (value.length === 0) { error = 'Postal code is required'; break; }
        const formatted = value.replace(/\s+/g, '').toUpperCase();
        if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(formatted)) {
          error = 'Enter a valid Canadian postal code (e.g., T2X 0M4)';
        } else if (value !== formatted.slice(0,3) + ' ' + formatted.slice(3)) {
          setPostalCode(formatted.slice(0,3) + ' ' + formatted.slice(3));
        }
        break;
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateAll = (): boolean => {
    const results = [
      validateField('phone', phone),
      validateField('age', age),
      validateField('address1', address1),
      validateField('city', city),
      validateField('province', province),
      validateField('postalCode', postalCode),
    ];
    return results.every(Boolean);
  };

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case 'phone': {
        const formatted = formatPhoneInput(value);
        setPhone(formatted);
        validateField('phone', formatted);
        return;
      }
      case 'age': setAge(value); break;
      case 'address1': 
        setAddress1(value); 
        debouncedFetchAddressSuggestions(value);
        break;
      case 'address2': setAddress2(value); break;
      case 'city': 
        setCity(value);
        // Auto-update location from city and province
        setLocation([value, province].filter(Boolean).join(', '));
        break;
      case 'province': 
        setProvince(value);
        // Auto-update location from city and province
        setLocation([city, value].filter(Boolean).join(', '));
        break;
      case 'postalCode': setPostalCode(value); break;
    }
    validateField(field, value);
  };

  const debouncedFetchAddressSuggestions = (q: string) => {
    const ts = Date.now();
    latestAddressQueryTsRef.current = ts;
    if (!q || q.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setIsFetchingAddress(true);
    setTimeout(async () => {
      if (latestAddressQueryTsRef.current !== ts) return;
      try {
        if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_PUBLIC_TOKEN') {
          setIsFetchingAddress(false);
          return;
        }
        const country = 'ca';
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?autocomplete=true&country=${country}&types=address,place,postcode&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const suggestions = features.map((f: any) => {
          const label = f.place_name as string;
          const context: any[] = f.context || [];
          const byId = (idStart: string) => context.find((c) => typeof c.id === 'string' && c.id.startsWith(idStart));
          const cityVal = (byId('place')?.text || byId('locality')?.text) as string | undefined;
          const region = (byId('region')?.short_code || byId('region')?.text) as string | undefined;
          const provinceVal = region?.toUpperCase() === 'CA-AB' ? 'AB' : (region === 'Alberta' ? 'AB' : region);
          const postal = (byId('postcode')?.text || '') as string;
          
          // Extract full address with house number
          // f.place_name format: "11811 Lake Fraser Dr SE, Calgary, Alberta T2J 7G4, Canada"
          // We want: "11811 Lake Fraser Dr SE"
          const fullAddress = f.address ? `${f.address} ${f.text}` : (f.place_name.split(',')[0] || f.text);
          
          return {
            id: f.id as string,
            label,
            address1: fullAddress,
            city: cityVal,
            province: provinceVal,
            postalCode: postal,
          };
        });
        setAddressSuggestions(suggestions);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsFetchingAddress(false);
      }
    }, 300);
  };

  const handleSelectAddressSuggestion = (s: { id: string; label: string; address1: string; city?: string; province?: string; postalCode?: string; }) => {
    setAddressSuggestions([]);
    setAddress1(s.address1 || address1);
    setCity(s.city || city);
    setProvince(s.province || province);
    const pc = s.postalCode ? (s.postalCode.length === 6 ? (s.postalCode.slice(0,3).toUpperCase() + ' ' + s.postalCode.slice(3).toUpperCase()) : s.postalCode.toUpperCase()) : postalCode;
    setPostalCode(pc);
    // Auto-set location from city and province
    setLocation([s.city, s.province].filter(Boolean).join(', '));
    if (s.city) validateField('city', s.city);
    if (s.province) validateField('province', s.province);
    if (s.postalCode) validateField('postalCode', s.postalCode);
  };

  const handleContinue = async () => {
    // Validate all fields
    if (!validateAll()) {
      setErrorModalMessage("Please fix the errors highlighted in red before continuing.");
      setErrorModalVisible(true);
      return;
    }

    if (!location) {
      setErrorModalMessage("Please select a location region to continue.");
      setErrorModalVisible(true);
      return;
    }

    if (!currentUser?._id) {
      setErrorModalMessage("Please sign in to continue.");
      setErrorModalVisible(true);
      return;
    }

    console.log("🔄 Personal Info - Starting submission");
    setIsSubmitting(true);

    try {
      // Save phone securely (Android) and sync to server
      const normalizedPhone = normalizeNanpToE164(phone);
      const uid = currentUser?._id ? String(currentUser._id) : undefined;
      await savePhoneSecurely(normalizedPhone, uid);
      try {
        await updatePhone({ phone: normalizedPhone });
      } catch (e) {
        console.log('⚠️ Personal Info - Could not sync phone immediately:', e);
      }

      // Save to WatermelonDB first (offline)
      await database.write(async () => {
        const userProfilesCollection = database.get("user_profiles");

        // Check if profile already exists for this user
        const existingProfiles = await userProfilesCollection.query().fetch();

        const existingProfile = existingProfiles.find(
          (p: any) => p.userId === currentUser._id
        );

        if (existingProfile) {
          // Update existing profile
          await existingProfile.update((profile: any) => {
            profile.age = age;
            profile.address1 = address1;
            profile.address2 = address2;
            profile.city = city;
            profile.province = province;
            profile.postalCode = postalCode;
            profile.location = location;
          });
          console.log("✅ Personal Info - Updated existing local profile");
        } else {
          // Create new profile
          await userProfilesCollection.create((profile: any) => {
            profile.userId = currentUser._id;
            profile.age = age;
            profile.address1 = address1;
            profile.address2 = address2;
            profile.city = city;
            profile.province = province;
            profile.postalCode = postalCode;
            profile.location = location;
            profile.onboardingCompleted = false;
          });
          console.log("✅ Personal Info - Created new local profile");
        }
      });

      console.log("✅ Personal Info - Saved to local database");

      // Then sync with Convex (online) - this will work when there's internet
      try {
        await updatePersonalInfo({ 
          age,
          address1,
          address2,
          city,
          province,
          postalCode,
          location, 
          onboardingCompleted: false 
        });
        console.log("✅ Personal Info - Synced with Convex");
      } catch (syncError) {
        console.log(
          "⚠️ Personal Info - Saved locally, will sync when online:",
          syncError
        );
        // Don't show error to user - data is saved locally
      }

      console.log("➡️ Navigating to emergency contact");
      router.push("/auth/emergency-contact");
    } catch (error) {
      console.error("❌ Personal Info - Error:", error);
      setErrorModalMessage("Failed to save personal information. Please try again.");
      setErrorModalVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with logo */}
            <CurvedHeader
              title="Alberta Health Connect"
              height={150}
              showLogo={true}
            />

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text
                style={[
                  styles.progressText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Step 1 of 3
              </Text>
            </View>

            <View style={styles.contentSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Personal Information
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Help us personalize your experience
              </Text>

              <View style={styles.formContainer}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Phone Number *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.phone ? styles.inputError : null,
                  ]}
                  placeholder="(403) 555-0123"
                  placeholderTextColor="#999"
                  value={phone}
                  onChangeText={(val) => handleInputChange('phone', val)}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  maxLength={14}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Age *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.age ? styles.inputError : null,
                  ]}
                  placeholder="Enter your age"
                  placeholderTextColor="#999"
                  value={age}
                  onChangeText={(val) => handleInputChange('age', val)}
                  keyboardType="numeric"
                  maxLength={3}
                />
                {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    styles.locationLabel,
                  ]}
                >
                  Address Line 1 *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.address1 ? styles.inputError : null,
                  ]}
                  placeholder="Enter your street address"
                  placeholderTextColor="#999"
                  value={address1}
                  onChangeText={(val) => handleInputChange('address1', val)}
                  autoCapitalize="words"
                />
                {errors.address1 ? <Text style={styles.errorText}>{errors.address1}</Text> : null}
                {addressSuggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {addressSuggestions.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectAddressSuggestion(s)}
                      >
                        <Text style={styles.suggestionText}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {isFetchingAddress && (
                  <Text style={styles.suggestionLoading}>Loading suggestions...</Text>
                )}

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    styles.locationLabel,
                  ]}
                >
                  Address Line 2
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                  placeholder="Apt, Suite, Unit, Building (Optional)"
                  placeholderTextColor="#999"
                  value={address2}
                  onChangeText={(val) => handleInputChange('address2', val)}
                  autoCapitalize="words"
                />

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    styles.locationLabel,
                  ]}
                >
                  City *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.city ? styles.inputError : null,
                  ]}
                  placeholder="Enter your city"
                  placeholderTextColor="#999"
                  value={city}
                  onChangeText={(val) => handleInputChange('city', val)}
                  autoCapitalize="words"
                />
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    styles.locationLabel,
                  ]}
                >
                  Province *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.province ? styles.inputError : null,
                  ]}
                  placeholder="Select region"
                  placeholderTextColor="#999"
                  value={province}
                  onChangeText={(val) => handleInputChange('province', val)}
                  autoCapitalize="characters"
                />
                {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}

                <Text
                  style={[
                    styles.fieldLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    styles.locationLabel,
                  ]}
                >
                  Postal Code *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    errors.postalCode ? styles.inputError : null,
                  ]}
                  placeholder="T2X 0M4"
                  placeholderTextColor="#999"
                  value={postalCode}
                  onChangeText={(val) => handleInputChange('postalCode', val)}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                {errors.postalCode ? <Text style={styles.errorText}>{errors.postalCode}</Text> : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  isSubmitting && styles.continueButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.continueButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>

      {/* Error Modal */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContent}>
            <Text style={[styles.errorModalTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Validation Error
            </Text>
            <Text style={[styles.errorModalMessage, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              {errorModalMessage}
            </Text>
            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={[styles.errorModalButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                OK
              </Text>
            </TouchableOpacity>
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
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "33%",
    backgroundColor: "#2A7DE1",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  formContainer: {
    width: "100%",
    marginBottom: 40,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  locationLabel: {
    marginTop: 16,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customPickerButton: {
    width: "100%",
    minHeight: 50,
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  customPickerText: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 350,
    alignItems: "stretch",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
    color: "#1A1A1A",
    textAlign: "center",
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  modalCancelText: {
    color: "#2A7DE1",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "red",
    borderWidth: 1.5,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  suggestionsBox: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 8,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  suggestionLoading: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: -4,
    marginBottom: 8,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  errorModalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  errorModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
