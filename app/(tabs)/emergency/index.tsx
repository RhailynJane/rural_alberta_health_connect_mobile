import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

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
          name: "Rural Health Centre",
          number: "(780) 555-0123",
          distance: "Approx. 45 minutes away",
        });
        setIsLoading(false);
      }, 1500); // Simulate network delay
    };

    simulateFetchClinicData();
  }, []);

  // Function to handle emergency calls
  const handleEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch((err) =>
      Alert.alert("Error", "Could not make the call. Please check your device.")
    );
  };

  return (
    <CurvedBackground>
      <CurvedHeader title="Emergency" height={120} showLogo={true} />

      <ScrollView style={styles.container}>
        {/* Emergency Warning Banner */}
        <View style={styles.emergencyBanner}>
          <Icon name="warning" size={24} color="#cb2a2aff" />
          <Text style={styles.emergencyText}>
            If you or someone else is experiencing a life-threatening emergency,
            call 911 immediately. Don&apos;t wait.
          </Text>
        </View>

        {/* Emergency Contacts Section */}
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>

        {/* Emergency Services Card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="local-hospital" size={24} color="#E12D2D" />
              <Text style={styles.cardTitle}>Emergency Services</Text>
            </View>
            <Text style={styles.cardDescription}>
              Life-threatening emergencies
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardNumber}>911</Text>
              <TouchableOpacity
                style={[styles.callButton, styles.emergencyButton]}
                onPress={() => handleEmergencyCall("911")}
              >
                <Icon name="call" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Health Link Alberta Card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="healing" size={24} color="#2D89E1" />
              <Text style={styles.cardTitle}>Health Link Alberta</Text>
            </View>
            <Text style={styles.cardDescription}>24/7 health advice</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardNumber}>811</Text>
              <TouchableOpacity 
                style={[styles.callButton, styles.healthButton]}
                onPress={() => handleEmergencyCall('811')}
              >
                <Icon name="call" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Local Clinic Card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="local-pharmacy" size={24} color="#2DE16B" />
              <Text style={styles.cardTitle}>Local Clinic</Text>
            </View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Finding nearest clinic...</Text>
              </View>
            ) : clinicInfo ? (
              <>
                <Text style={styles.cardDescription}>{clinicInfo.name}</Text>
                {clinicInfo.distance && (
                  <Text style={styles.distanceText}>{clinicInfo.distance}</Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardNumber}>{clinicInfo.number}</Text>
                  <TouchableOpacity 
                    style={[styles.callButton, styles.clinicButton]}
                    onPress={() => handleEmergencyCall(clinicInfo.number.replace(/[^0-9]/g, ''))}
                  >
                    <Icon name="call" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.cardDescription}>Clinic information not available</Text>
            )}
          </View>
        </View>



      </ScrollView>
      <BottomNavigation />
    </CurvedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F4",
    borderLeftWidth: 5,
    borderLeftColor: "#E12D2D",
    padding: 16,
    marginBottom: 20,
    borderRadius: 5,
  },
  emergencyText: {
    marginLeft: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardContent: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333",
  },
  cardDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cardNumber: {
    fontFamily: FONTS.BarlowSemiCondensedExtraBold,
    fontWeight: "900",
    color: "#333",
    fontSize: 25,
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emergencyButton: {
    backgroundColor: "#E12D2D",
  },
  healthButton: {
    backgroundColor: "#2D89E1",
  },
  clinicButton: {
    backgroundColor: '#2DE16B',
  },
  distanceText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 10,
  },
  loadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    color: '#666',
    fontStyle: 'italic',
  },
});
