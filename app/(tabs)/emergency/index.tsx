import React, { useEffect, useState } from 'react';
import {
  Text,
  View
} from 'react-native';
import BottomNavigation from '../../components/bottomNavigation';
import CurvedBackground from '../../components/curvedBackground';
import CurvedHeader from '../../components/curvedHeader';
import { FONTS } from '../../constants/constants';

// Define types for our component
interface ClinicInfo {
  name: string;
  number: string;
  distance?: string;
}

export default function Emergency() {
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate fetching clinic information
  useEffect(() => {
    // Mock fetching data
    const simulateFetchClinicData = () => {
      setTimeout(() => {
        setClinicInfo({
          name: 'Rural Health Centre',
          number: '(780) 555-0123',
          distance: 'Approx. 45 minutes away'
        });
        setIsLoading(false);
      }, 1500); // Simulate network delay
    };

    simulateFetchClinicData();
  }, []);
  
  return (
    <CurvedBackground>
      <CurvedHeader
        title="Emergency"
        height={120}
        showLogo={true}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.BarlowSemiCondensed }}>Emergency Screen</Text>
      </View>
      <BottomNavigation />
    </CurvedBackground>
  );
}