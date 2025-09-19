import React, { useState } from 'react';
import {
  Text,
  useColorScheme,
  View
} from 'react-native';
import BottomNavigation from '../../components/bottomNavigation';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { FONTS } from '../../constants/constants';

export default function Profile() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';


  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    personalInfo: false,
    emergencyContacts: false,
    medicalInfo: false,
    appSettings: false
  });

  // State for user mock data
  const [userData, setUserData] = useState({
    fullName: 'John Doe',
    dateOfBirth: '1990-01-01',
    phoneNumber: '+1 (555) 123-4567',
    location: 'New York, USA',
    emergencyContacts: [
      {
        name: 'Jane Smith',
        relationship: 'Spouse',
        phoneNumber: '+1 (555) 987-6543',
        location: 'New York, USA'
      }
    ],
    allergies: 'Peanuts, Shellfish',
    currentMedications: 'None',
    medicalConditions: 'Asthma',
    symptomReminder: true,
    dataEncryption: true,
    locationServices: true
  });

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Handle input changes
  const handleInputChange = (field: keyof typeof userData, value: string | boolean) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <CurvedBackground>
      <CurvedHeader
        title="Profile"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>Profile Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}