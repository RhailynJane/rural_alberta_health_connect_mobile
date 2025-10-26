import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { MAPBOX_ACCESS_TOKEN } from "../../_config/mapbox.config";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import StatusModal from "../../components/StatusModal";
import { COLORS, FONTS } from "../../constants/constants";
import { normalizeNanpToE164, savePhoneSecurely } from "../../utils/securePhone";

export default function ProfileInformation() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );
  
  const userProfile = useQuery(
    api.profile.personalInformation.getProfile,
    isAuthenticated ? {} : "skip"
  );

  const updatePersonalInfo = useMutation(
    api.profile.personalInformation.updatePersonalInfo
  );
  const updatePhone = useMutation(api.users.updatePhone);
  const updateEmergencyContactMutation = useMutation(
    (api as any)["emergencyContactOnboarding/update"].withNameAndPhone
  );
  const updateMedicalHistoryMutation = useMutation(
    (api as any)["medicalHistoryOnboarding/update"].withAllConditions
  );

  // State for user data
  const [userData, setUserData] = useState({
    phone: "",
    age: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    location: "",
    allergies: "",
    currentMedications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalConditions: "",
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

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
  const latestAddressQueryTsRef = useRef<number>(0);

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    personalInfo: false,
    emergencyContacts: false,
    medicalInfo: false,
  });

  // Load profile data
  React.useEffect(() => {
    if (userProfile) {
      setUserData((prev) => ({
        ...prev,
        age: userProfile.age || "",
        address1: userProfile.address1 || "",
        address2: userProfile.address2 || "",
        city: userProfile.city || "",
        province: userProfile.province || "",
        postalCode: userProfile.postalCode || "",
        location: userProfile.location || "",
        allergies: userProfile.allergies || "",
        currentMedications: userProfile.currentMedications || "",
        emergencyContactName: userProfile.emergencyContactName || "",
        emergencyContactPhone: userProfile.emergencyContactPhone || "",
        medicalConditions: userProfile.medicalConditions || "",
      }));
    }
  }, [userProfile]);

  // Prefill phone from current user
  React.useEffect(() => {
    if (currentUser?.phone !== undefined) {
      setUserData((prev) => ({ ...prev, phone: currentUser?.phone || "" }));
    }
  }, [currentUser?.phone]);

  const toggleSection = async (section: keyof typeof expandedSections) => {
    if (expandedSections[section]) {
      // Closing section - save data
      let ok = false;
      if (section === "personalInfo") {
        ok = await handleUpdatePersonalInfo();
      } else if (section === "emergencyContacts") {
        ok = await handleUpdateEmergencyContact();
      } else if (section === "medicalInfo") {
        ok = await handleUpdateMedicalInfo();
      }
      if (!ok) return; // Keep open if validation failed
    }
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleUpdatePersonalInfo = async (): Promise<boolean> => {
    try {
      const valid = validatePersonalInfo();
      if (!valid) {
        setSuccessMessage("");
        setModalType('error');
        setModalTitle('Validation Error');
        setModalMessage('Please correct the highlighted fields in Personal Information.');
        setModalVisible(true);
        return false;
      }
      
      // Update phone
      try {
        const normalized = normalizeNanpToE164(userData.phone || "");
        if (normalized) {
          await updatePhone({ phone: normalized });
          const uid = currentUser?._id ? String(currentUser._id) : undefined;
          await savePhoneSecurely(normalized, uid);
        }
      } catch (e) {
        console.log("⚠️ Phone update skipped:", e);
      }

      await updatePersonalInfo({
        age: userData.age,
        address1: userData.address1,
        address2: userData.address2,
        city: userData.city,
        province: userData.province,
        postalCode: userData.postalCode,
        location: userData.location,
      });
      
      setModalType('success');
      setModalTitle('Success');
      setModalMessage('Personal information updated successfully');
      setModalVisible(true);
      setSuccessMessage("Personal information updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      console.error(error);
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Failed to update personal information. Please try again.');
      setModalVisible(true);
      return false;
    }
  };

  const handleUpdateEmergencyContact = async (): Promise<boolean> => {
    try {
      const valid = validateEmergencyContact();
      if (!valid) {
        setSuccessMessage("");
        setModalType('error');
        setModalTitle('Validation Error');
        setModalMessage('Please correct the highlighted fields in Emergency Contact.');
        setModalVisible(true);
        return false;
      }
      
      await updateEmergencyContactMutation({
        emergencyContactName: userData.emergencyContactName,
        emergencyContactPhone: userData.emergencyContactPhone,
      });
      
      setModalType('success');
      setModalTitle('Success');
      setModalMessage('Emergency contact updated successfully');
      setModalVisible(true);
      setSuccessMessage("Emergency contact updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      console.error(error);
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Failed to update emergency contact. Please try again.');
      setModalVisible(true);
      return false;
    }
  };

  const handleUpdateMedicalInfo = async (): Promise<boolean> => {
    try {
      const valid = validateMedicalInfo();
      if (!valid) {
        setSuccessMessage("");
        setModalType('error');
        setModalTitle('Validation Error');
        setModalMessage('Please correct the highlighted fields in Medical Information.');
        setModalVisible(true);
        return false;
      }
      
      await updateMedicalHistoryMutation({
        allergies: userData.allergies,
        currentMedications: userData.currentMedications,
        medicalConditions: userData.medicalConditions,
      });
      
      setModalType('success');
      setModalTitle('Success');
      setModalMessage('Medical information updated successfully');
      setModalVisible(true);
      setSuccessMessage("Medical information updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (error) {
      console.error(error);
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Failed to update medical information. Please try again.');
      setModalVisible(true);
      return false;
    }
  };

  const handleInputChange = (field: keyof typeof userData, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
    
    if (field === "address1") {
      debouncedFetchAddressSuggestions(value);
    }
    
    if (field === "city" || field === "province") {
      setUserData((prev) => ({
        ...prev,
        location: [
          field === "city" ? value : prev.city,
          field === "province" ? value : prev.province,
        ].filter(Boolean).join(", "),
      }));
    }
  };

  const validateField = (field: string, raw: string): boolean => {
    const value = (raw || "").trim();
    let error = "";
    
    switch (field) {
      case "phone": {
        if (value.length === 0) {
          error = "Phone number is required";
          break;
        }
        const digits = value.replace(/\D/g, "");
        if (!(digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))) {
          error = "Enter a valid phone number";
        }
        break;
      }
      case "age": {
        if (value.length === 0) {
          error = "Age is required";
          break;
        }
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 120) error = "Age must be between 0 and 120";
        break;
      }
      case "address1": {
        if (value.length === 0) error = "Address is required";
        break;
      }
      case "city": {
        if (value.length === 0) error = "City is required";
        break;
      }
      case "province": {
        if (value.length === 0) {
          error = "Province is required";
        } else {
          const allowed = ["AB", "Alberta"];
          if (!allowed.includes(value)) {
            error = 'Use "Alberta" or "AB"';
          }
        }
        break;
      }
      case "postalCode": {
        if (value.length === 0) {
          error = "Postal code is required";
          break;
        }
        const formatted = value.replace(/\s+/g, "").toUpperCase();
        if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(formatted)) {
          error = "Enter a valid Canadian postal code (e.g., T2X 0M4)";
        } else if (value !== formatted.slice(0, 3) + " " + formatted.slice(3)) {
          setUserData((prev) => ({ ...prev, postalCode: formatted.slice(0, 3) + " " + formatted.slice(3) }));
        }
        break;
      }
      case "emergencyContactPhone": {
        if (value.length === 0) {
          error = "Phone is required";
          break;
        }
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 10) {
          error = "Enter a 10-digit phone number";
        }
        break;
      }
      case "emergencyContactName": {
        if (value.length > 0 && value.length < 2) error = "Name too short";
        break;
      }
    }
    
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validatePersonalInfo = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      "phone",
      "age",
      "address1",
      "city",
      "province",
      "postalCode",
      "location",
    ];
    const results = fieldsToCheck.map((f) =>
      validateField(f, String((userData as any)[f] ?? ""))
    );
    return results.every(Boolean);
  };

  const validateEmergencyContact = (): boolean => {
    const fieldsToCheck: (keyof typeof userData)[] = [
      "emergencyContactName",
      "emergencyContactPhone",
    ];
    const results = fieldsToCheck.map((f) =>
      validateField(f, String((userData as any)[f] ?? ""))
    );
    return results.every(Boolean);
  };

  const validateMedicalInfo = (): boolean => {
    // Medical info fields are optional, no strict validation
    return true;
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
        if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === "YOUR_MAPBOX_PUBLIC_TOKEN") {
          setIsFetchingAddress(false);
          return;
        }
        const country = "ca";
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q
        )}.json?autocomplete=true&country=${country}&types=address,place,postcode&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        const suggestions = features.map((f: any) => {
          const label = f.place_name as string;
          const context: any[] = f.context || [];
          const byId = (idStart: string) =>
            context.find((c) => typeof c.id === "string" && c.id.startsWith(idStart));
          const cityVal = (byId("place")?.text || byId("locality")?.text) as string | undefined;
          const region = (byId("region")?.short_code || byId("region")?.text) as string | undefined;
          const provinceVal =
            region?.toUpperCase() === "CA-AB" ? "AB" : region === "Alberta" ? "AB" : region;
          const postal = (byId("postcode")?.text || "") as string;
          const fullAddress = f.address ? `${f.address} ${f.text}` : f.place_name.split(",")[0] || f.text;

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

  const handleSelectAddressSuggestion = (s: {
    id: string;
    label: string;
    address1: string;
    city?: string;
    province?: string;
    postalCode?: string;
  }) => {
    setAddressSuggestions([]);
    setUserData((prev) => ({
      ...prev,
      address1: s.address1 || prev.address1,
      city: s.city || prev.city,
      province: s.province || prev.province,
      postalCode: s.postalCode
        ? s.postalCode.length === 6
          ? s.postalCode.slice(0, 3).toUpperCase() + " " + s.postalCode.slice(3).toUpperCase()
          : s.postalCode.toUpperCase()
        : prev.postalCode,
      location: [s.city, s.province].filter(Boolean).join(", ") || prev.location,
    }));
    if (s.city) validateField("city", s.city);
    if (s.province) validateField("province", s.province);
    if (s.postalCode) validateField("postalCode", s.postalCode);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader
          title="Profile Information"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />
        <ScrollView style={styles.container}>
          {successMessage ? (
            <View style={styles.successBanner}>
              <Icon name="check-circle" size={20} color={COLORS.white} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Personal Information */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("personalInfo")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Personal Information</Text>
              <Text style={styles.editButton}>
                {expandedSections.personalInfo ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>

            {expandedSections.personalInfo ? (
              <>
                <Text style={styles.sectionTitle}>Phone Number</Text>
                <TextInput
                  style={[styles.input, errors.phone ? styles.inputError : null]}
                  value={userData.phone}
                  onChangeText={(text) => handleInputChange("phone", text)}
                  placeholder="(403) 555-0123"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

                <Text style={styles.sectionTitle}>Age</Text>
                <TextInput
                  style={[styles.input, errors.age ? styles.inputError : null]}
                  value={userData.age}
                  onChangeText={(text) => handleInputChange("age", text)}
                  placeholder="e.g., 25"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="numeric"
                />
                {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}

                <Text style={styles.sectionTitle}>Address Line 1</Text>
                <TextInput
                  style={[styles.input, errors.address1 ? styles.inputError : null]}
                  value={userData.address1}
                  onChangeText={(text) => handleInputChange("address1", text)}
                  placeholder="Street address, P.O. box"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.address1 ? <Text style={styles.errorText}>{errors.address1}</Text> : null}
                {!!addressSuggestions.length && (
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
                    {isFetchingAddress ? (
                      <View style={styles.suggestionLoading}>
                        <Text style={styles.suggestionLoadingText}>Searching…</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <Text style={styles.sectionTitle}>Address Line 2</Text>
                <TextInput
                  style={styles.input}
                  value={userData.address2}
                  onChangeText={(text) => handleInputChange("address2", text)}
                  placeholder="Apartment, suite, unit, building (optional)"
                  placeholderTextColor={COLORS.lightGray}
                />

                <Text style={styles.sectionTitle}>City</Text>
                <TextInput
                  style={[styles.input, errors.city ? styles.inputError : null]}
                  value={userData.city}
                  onChangeText={(text) => handleInputChange("city", text)}
                  placeholder="e.g., Calgary"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

                <Text style={styles.sectionTitle}>Province</Text>
                <TextInput
                  style={[styles.input, errors.province ? styles.inputError : null]}
                  value={userData.province}
                  onChangeText={(text) => handleInputChange("province", text)}
                  placeholder="e.g., Alberta"
                  placeholderTextColor={COLORS.lightGray}
                  autoCapitalize="characters"
                />
                {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}

                <Text style={styles.sectionTitle}>Postal Code</Text>
                <TextInput
                  style={[styles.input, errors.postalCode ? styles.inputError : null]}
                  value={userData.postalCode}
                  onChangeText={(text) => handleInputChange("postalCode", text)}
                  placeholder="e.g., T2X 0M4"
                  placeholderTextColor={COLORS.lightGray}
                  autoCapitalize="characters"
                />
                {errors.postalCode ? <Text style={styles.errorText}>{errors.postalCode}</Text> : null}

                <Text style={styles.sectionTitle}>Location (for services)</Text>
                <TextInput
                  style={[styles.input, errors.location ? styles.inputError : null]}
                  value={userData.location}
                  onChangeText={(text) => handleInputChange("location", text)}
                  placeholder="City or region for nearby clinics"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Phone:</Text> {userData.phone || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Age:</Text> {userData.age || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Address:</Text> {userData.address1 || "Not set"}
                  {userData.address2 ? `, ${userData.address2}` : ""}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>City:</Text> {userData.city || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Province:</Text> {userData.province || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Postal Code:</Text> {userData.postalCode || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Location:</Text> {userData.location || "Not set"}
                </Text>
              </>
            )}
          </View>

          {/* Emergency Contact */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("emergencyContacts")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Emergency Contact</Text>
              <Text style={styles.editButton}>
                {expandedSections.emergencyContacts ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>

            {expandedSections.emergencyContacts ? (
              <>
                <Text style={styles.sectionTitle}>Contact Name</Text>
                <TextInput
                  style={[styles.input, errors.emergencyContactName ? styles.inputError : null]}
                  value={userData.emergencyContactName}
                  onChangeText={(text) => handleInputChange("emergencyContactName", text)}
                  placeholder="Emergency contact name"
                  placeholderTextColor={COLORS.lightGray}
                />
                {errors.emergencyContactName ? (
                  <Text style={styles.errorText}>{errors.emergencyContactName}</Text>
                ) : null}

                <Text style={styles.sectionTitle}>Phone Number</Text>
                <TextInput
                  style={[styles.input, errors.emergencyContactPhone ? styles.inputError : null]}
                  value={userData.emergencyContactPhone}
                  onChangeText={(text) => handleInputChange("emergencyContactPhone", text)}
                  placeholder="Emergency contact phone"
                  placeholderTextColor={COLORS.lightGray}
                  keyboardType="phone-pad"
                />
                {errors.emergencyContactPhone ? (
                  <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Name:</Text>{" "}
                  {userData.emergencyContactName || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Phone:</Text>{" "}
                  {userData.emergencyContactPhone || "Not set"}
                </Text>
              </>
            )}
          </View>

          {/* Medical Information */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("medicalInfo")}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>Medical Information</Text>
              <Text style={styles.editButton}>
                {expandedSections.medicalInfo ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>

            {expandedSections.medicalInfo ? (
              <>
                <Text style={styles.sectionTitle}>Allergies</Text>
                <TextInput
                  style={[styles.input, errors.allergies ? styles.inputError : null]}
                  value={userData.allergies}
                  onChangeText={(text) => handleInputChange("allergies", text)}
                  placeholder="List any allergies"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                />
                {errors.allergies ? <Text style={styles.errorText}>{errors.allergies}</Text> : null}

                <Text style={styles.sectionTitle}>Current Medications</Text>
                <TextInput
                  style={[styles.input, errors.currentMedications ? styles.inputError : null]}
                  value={userData.currentMedications}
                  onChangeText={(text) => handleInputChange("currentMedications", text)}
                  placeholder="List current medications"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                />
                {errors.currentMedications ? (
                  <Text style={styles.errorText}>{errors.currentMedications}</Text>
                ) : null}

                <Text style={styles.sectionTitle}>Medical Conditions</Text>
                <TextInput
                  style={[styles.input, errors.medicalConditions ? styles.inputError : null]}
                  value={userData.medicalConditions}
                  onChangeText={(text) => handleInputChange("medicalConditions", text)}
                  placeholder="List medical conditions"
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                />
                {errors.medicalConditions ? (
                  <Text style={styles.errorText}>{errors.medicalConditions}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Allergies:</Text>{" "}
                  {userData.allergies || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Medications:</Text>{" "}
                  {userData.currentMedications || "Not set"}
                </Text>
                <Text style={styles.text}>
                  <Text style={{ fontWeight: "bold" }}>Conditions:</Text>{" "}
                  {userData.medicalConditions || "Not set"}
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.backButtonText}>Back to Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </CurvedBackground>

      {/* StatusModal for success/error messages */}
      <StatusModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
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
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.darkGray,
    marginTop: 12,
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    color: COLORS.darkText,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  suggestionsBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  suggestionLoading: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suggestionLoadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    fontStyle: "italic",
  },
  editButton: {
    color: COLORS.primary,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
  },
  successBanner: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 100,
    marginTop: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
});
