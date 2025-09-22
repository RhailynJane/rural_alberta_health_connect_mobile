# Profile Module Documentation

## Overview
The Profile module provides comprehensive user data management with privacy-focused design and medical information storage. Built specifically for healthcare applications, it emphasizes data encryption, local storage, and secure handling of sensitive medical information.

## Module Structure

```
profile/
└── index.tsx              # Profile management and settings
```

---

## Profile Screen (`/profile`)

### Purpose
Central user profile management hub allowing users to maintain personal information, emergency contacts, medical data, and application preferences with emphasis on privacy and data security.

### Frontend Implementation
```tsx
// app/profile/index.tsx
export default function Profile() {
  const [expandedSections, setExpandedSections] = useState({
    personalInfo: false,
    emergencyContacts: false, 
    medicalInfo: false,
    appSettings: false
  });
  
  const [userData, setUserData] = useState({
    ageRange: '25-34',
    allergies: 'Peanuts',
    currentMedications: 'None',
    emergencyContactName: 'Jane Cona',
    emergencyContactPhone: '+1 (403) 234-4567',
    location: 'Calgary, AB',
    medicalConditions: 'Asthma',
    symptomReminder: true,
    dataEncryption: true,
    locationServices: true
  });

  return (
    <CurvedBackground>
      <CurvedHeader title="Profile" height={120} showLogo={true} />
      <ScrollView>
        <PrivacyNoticeCard />
        <PersonalInformationCard />
        <EmergencyContactCard />
        <MedicalInformationCard />
        <AppSettingsCard />
        <SignOutButton />
      </ScrollView>
    </CurvedBackground>
  );
}
```

---

## User Data Structure

### Complete User Profile Interface
```typescript
interface UserProfile {
  // Personal Information
  userId: string;
  ageRange: string;
  location: string;
  
  // Emergency Contacts
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship?: string;
  
  // Medical Information
  allergies: string;
  currentMedications: string;
  medicalConditions: string;
  
  
  // App Settings
  symptomReminder: boolean;
  dataEncryption: boolean;
  locationServices: boolean;
  
  // System Fields
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}
```

### Form State Management
```typescript
interface ProfileFormState {
  personalInfo: {
    ageRange: string;
    location: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo: {
    allergies: string;
    medications: string;
    conditions: string;
  };
  appSettings: {
    symptomReminder: boolean;
    dataEncryption: boolean;
    locationServices: boolean;
  };
}
```

---

## Backend Integration (Convex)

### Database Schema
```typescript
// convex/schema.ts
export default defineSchema({
  userProfiles: defineTable({
    userId: v.id("users"),
    
    // Personal Information
    ageRange: v.string(),
    location: v.string(),
    
    // Emergency Contacts
    emergencyContactName: v.string(),
    emergencyContactPhone: v.string(),
    emergencyContactRelationship: v.optional(v.string()),

    
    // Medical Information (encrypted)
    allergies: v.string(),
    currentMedications: v.string(),
    medicalConditions: v.string(),
    
    // App Settings
    symptomReminder: v.boolean(),
    dataEncryption: v.boolean(),
    locationServices: v.boolean(),
    
    // Privacy and Consent
    privacyConsentGiven: v.boolean(),
    dataRetentionPeriod: v.number(), // days
    lastPrivacyUpdate: v.number(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.number(),
  })
  .index("by_user", ["userId"]),
  
  users: defineTable({
    email: v.string(),
    name: v.string(),
    isActive: v.boolean(),
    registrationDate: v.number(),
  })
  .index("by_email", ["email"]),
  
  // Audit log for sensitive medical data changes
  profileAuditLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    fieldChanged: v.string(),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
  .index("by_user_timestamp", ["userId", "timestamp"]),
});
```

### API Functions

#### Get User Profile
```typescript
// convex/profiles.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    return profile;
  },
});
```

#### Update Profile Section
```typescript
export const updatePersonalInfo = mutation({
  args: {
    ageRange: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    if (profile) {
      // Update existing profile
      await ctx.db.patch(profile._id, {
        ageRange: args.ageRange,
        location: args.location,
        updatedAt: Date.now(),
      });
      
      // Log the change
      await ctx.db.insert("profileAuditLog", {
        userId: user._id,
        action: "update_personal_info",
        fieldChanged: "ageRange,location",
        timestamp: Date.now(),
      });
    } else {
      // Create new profile
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        ageRange: args.ageRange,
        location: args.location,
        // Default values
        emergencyContactName: "",
        emergencyContactPhone: "",
        allergies: "",
        currentMedications: "",
        medicalConditions: "",
        symptomReminder: true,
        dataEncryption: true,
        locationServices: false,
        privacyConsentGiven: true,
        dataRetentionPeriod: 2555, // 7 years
        lastPrivacyUpdate: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});
```

#### Update Medical Information (Encrypted)
```typescript
export const updateMedicalInfo = mutation({
  args: {
    allergies: v.string(),
    currentMedications: v.string(),
    medicalConditions: v.string(),
    bloodType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    if (!profile) throw new Error("Profile not found");
    
    // In production, encrypt sensitive medical data
    const encryptedData = {
      allergies: args.allergies, // encrypt(args.allergies)
      currentMedications: args.currentMedications, // encrypt(args.currentMedications)
      medicalConditions: args.medicalConditions, // encrypt(args.medicalConditions)
    };
    
    await ctx.db.patch(profile._id, {
      ...encryptedData,
      updatedAt: Date.now(),
    });
    
    // Audit log for medical data changes
    await ctx.db.insert("profileAuditLog", {
      userId: user._id,
      action: "update_medical_info",
      fieldChanged: "allergies,medications,conditions,bloodType",
      timestamp: Date.now(),
    });
    
    return { success: true };
  },
});
```

#### Update App Settings
```typescript
export const updateAppSettings = mutation({
  args: {
    symptomReminder: v.boolean(),
    dataEncryption: v.boolean(),
    locationServices: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    if (!profile) throw new Error("Profile not found");
    
    const updateData = {
      symptomReminder: args.symptomReminder,
      dataEncryption: args.dataEncryption,
      locationServices: args.locationServices,
      updatedAt: Date.now(),
    };
    
    if (args.notificationPreferences) {
      updateData.notificationPreferences = args.notificationPreferences;
    }
    
    await ctx.db.patch(profile._id, updateData);
    
    return { success: true };
  },
});
```

---

## Frontend Integration with Convex

### Profile Data Loading
```tsx
// app/profile/index.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Profile() {
  const userProfile = useQuery(api.profiles.getUserProfile);
  const updatePersonalInfo = useMutation(api.profiles.updatePersonalInfo);
  const updateMedicalInfo = useMutation(api.profiles.updateMedicalInfo);
  const updateAppSettings = useMutation(api.profiles.updateAppSettings);
  
  const [userData, setUserData] = useState({
    ageRange: '',
    location: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    currentMedications: '',
    medicalConditions: '',
    symptomReminder: true,
    dataEncryption: true,
    locationServices: false,
  });
  
  // Load data when profile is fetched
  useEffect(() => {
    if (userProfile) {
      setUserData({
        ageRange: userProfile.ageRange || '',
        location: userProfile.location || '',
        emergencyContactName: userProfile.emergencyContactName || '',
        emergencyContactPhone: userProfile.emergencyContactPhone || '',
        allergies: userProfile.allergies || '',
        currentMedications: userProfile.currentMedications || '',
        medicalConditions: userProfile.medicalConditions || '',
        symptomReminder: userProfile.symptomReminder,
        dataEncryption: userProfile.dataEncryption,
        locationServices: userProfile.locationServices,
      });
    }
  }, [userProfile]);
  
  // Handle saving personal information
  const handleSavePersonalInfo = async () => {
    try {
      await updatePersonalInfo({
        ageRange: userData.ageRange,
        location: userData.location,
      });
      
      Alert.alert("Success", "Personal information updated successfully");
      toggleSection('personalInfo');
    } catch (error) {
      Alert.alert("Error", "Failed to update personal information");
      console.error(error);
    }
  };
  
  // Handle saving medical information
  const handleSaveMedicalInfo = async () => {
    try {
      await updateMedicalInfo({
        allergies: userData.allergies,
        currentMedications: userData.currentMedications,
        medicalConditions: userData.medicalConditions,
      });
      
      Alert.alert("Success", "Medical information updated successfully");
      toggleSection('medicalInfo');
    } catch (error) {
      Alert.alert("Error", "Failed to update medical information");
      console.error(error);
    }
  };
  
  // Handle settings changes (real-time)
  const handleSettingChange = async (field: string, value: boolean) => {
    try {
      setUserData(prev => ({ ...prev, [field]: value }));
      
      await updateAppSettings({
        symptomReminder: field === 'symptomReminder' ? value : userData.symptomReminder,
        dataEncryption: field === 'dataEncryption' ? value : userData.dataEncryption,
        locationServices: field === 'locationServices' ? value : userData.locationServices,
      });
    } catch (error) {
      // Revert on error
      setUserData(prev => ({ ...prev, [field]: !value }));
      Alert.alert("Error", "Failed to update setting");
    }
  };
  
  if (userProfile === undefined) {
    return <LoadingScreen />;
  }
  
  return (
    // Component JSX with loaded data
    <ProfileContent userData={userData} />
  );
}
```

---

## Privacy and Security Features

### Data Encryption Implementation
```typescript
// utils/encryption.ts
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;

export const encryptMedicalData = (data: string): string => {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not configured');
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

export const decryptMedicalData = (encryptedData: string): string => {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not configured');
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
```

### Privacy Notice Component
```tsx
const PrivacyNoticeCard = () => (
  <View style={styles.card}>
    <View style={styles.privacyHeader}>
      <View style={styles.privacyIcon}>
        <Text style={styles.privacyIconText}>✓</Text>
      </View>
      <Text style={styles.cardTitle}>Privacy Protected</Text>
    </View>
    <Text style={styles.privacyText}>
      Your personal information is encrypted and stored locally.  
      No data is shared without your consent.
    </Text>
  </View>
);
```

### Data Retention Policy
```typescript
// convex/dataRetention.ts
export const cleanupExpiredData = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Clean up audit logs older than 30 days
    const oldLogs = await ctx.db
      .query("profileAuditLog")
      .filter((q) => q.lt(q.field("timestamp"), thirtyDaysAgo))
      .collect();
    
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
    
    // Check for profiles with expired data retention
    const profiles = await ctx.db.query("userProfiles").collect();
    
    for (const profile of profiles) {
      const retentionExpiry = profile.createdAt + (profile.dataRetentionPeriod * 24 * 60 * 60 * 1000);
      
      if (Date.now() > retentionExpiry) {
        // Anonymize or delete profile data
        await ctx.db.patch(profile._id, {
          allergies: "[EXPIRED]",
          currentMedications: "[EXPIRED]",
          medicalConditions: "[EXPIRED]",
          emergencyContactName: "[EXPIRED]",
          emergencyContactPhone: "[EXPIRED]",
        });
      }
    }
  },
});
```

---

## Component Architecture

### Expandable Section Pattern
```tsx
interface ExpandableSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  renderCollapsed: () => React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children,
  renderCollapsed,
}) => (
  <View style={styles.card}>
    <TouchableOpacity style={styles.cardHeader} onPress={onToggle}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.editButton}>
        {isExpanded ? 'Done' : 'Edit'}
      </Text>
    </TouchableOpacity>
    
    {isExpanded ? children : renderCollapsed()}
  </View>
);
```

### Form Input Components
```tsx
interface ProfileInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: string;
  secure?: boolean;
}

const ProfileInput: React.FC<ProfileInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  secure = false,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.sectionTitle}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.lightGray}
      multiline={multiline}
      keyboardType={keyboardType}
      secureTextEntry={secure}
    />
  </View>
);
```

---

## Medical Information Handling

### Sensitive Data Categories
```typescript
enum MedicalDataCategory {
  ALLERGIES = 'allergies',
  MEDICATIONS = 'medications',
  CONDITIONS = 'conditions',
}

interface MedicalDataValidation {
  category: MedicalDataCategory;
  required: boolean;
  maxLength: number;
  pattern?: RegExp;
  sensitivityLevel: 'high' | 'medium' | 'low';
}

const medicalDataValidations: MedicalDataValidation[] = [
  {
    category: MedicalDataCategory.ALLERGIES,
    required: false,
    maxLength: 500,
    sensitivityLevel: 'high',
  },
  {
    category: MedicalDataCategory.MEDICATIONS,
    required: false,
    maxLength: 1000,
    sensitivityLevel: 'high',
  },
  {
    category: MedicalDataCategory.CONDITIONS,
    required: false,
    maxLength: 1000,
    sensitivityLevel: 'high',
  },
];
```

### Input Validation
```typescript
const validateMedicalInput = (category: MedicalDataCategory, value: string): ValidationResult => {
  const validation = medicalDataValidations.find(v => v.category === category);
  if (!validation) return { isValid: true };
  
  // Required field check
  if (validation.required && !value.trim()) {
    return { isValid: false, error: `${category} is required` };
  }
  
  // Length check
  if (value.length > validation.maxLength) {
    return { isValid: false, error: `${category} exceeds maximum length` };
  }
  
  // Pattern check
  if (validation.pattern && !validation.pattern.test(value)) {
    return { isValid: false, error: `Invalid ${category} format` };
  }
  
  return { isValid: true };
};
```

---

## Settings Management

### Notification Preferences
```tsx
const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    healthTips: true,
    medicationReminders: true,
    emergencyAlerts: true,
    symptomReminders: true,
  });
  
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notification Preferences</Text>
      
      {Object.entries(preferences).map(([key, value]) => (
        <View key={key} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
          </Text>
          <Switch
            value={value}
            onValueChange={(newValue) => {
              setPreferences(prev => ({ ...prev, [key]: newValue }));
              handleSettingChange(key, newValue);
            }}
          />
        </View>
      ))}
    </View>
  );
};
```

### Data Management Controls
```tsx
const DataManagementCard = () => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Data Management</Text>
    
    <TouchableOpacity style={styles.actionButton} onPress={exportData}>
      <Icon name="file-download" size={20} color={COLORS.primary} />
      <Text style={styles.actionText}>Export My Data</Text>
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.actionButton} onPress={deleteAccount}>
      <Icon name="delete-forever" size={20} color={COLORS.error} />
      <Text style={[styles.actionText, { color: COLORS.error }]}>
        Delete Account
      </Text>
    </TouchableOpacity>
  </View>
);
```

---

## Authentication Integration

### Sign Out Functionality
```tsx
const handleSignOut = () => {
  Alert.alert(
    "Sign Out",
    "Are you sure you want to sign out?",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Sign Out", 
        onPress: async () => {
          try {
            // Clear local storage
            await AsyncStorage.clear();
            
            // Clear Convex auth
            await signOut();
            
            // Navigate to sign-in
            router.replace('/auth/signin');
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
        style: "destructive"
      }
    ]
  );
};
```

### Session Management
```typescript
// utils/session.ts
export const updateLastLoginTime = async () => {
  try {
    await updateUserSession({
      lastLoginAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to update login time:', error);
  }
};

export const checkSessionExpiry = (lastLoginAt: number): boolean => {
  const sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
  return (Date.now() - lastLoginAt) > sessionDuration;
};
```

---

The Profile module provides comprehensive user data management with strong privacy protections and medical data security. The implementation prioritizes user control, data encryption, and regulatory compliance while maintaining a smooth user experience for managing personal health information.