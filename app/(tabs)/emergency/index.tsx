import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
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

interface LocationDetails {
  approximateLocation: string;
  nearestHospital: string;
  emergencyResponseTime: string;
  localClinic: ClinicInfo;
}

export default function Emergency() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Get location services status and emergency details
  const locationStatus = useQuery(api.locationServices.getLocationServicesStatus);
  const emergencyDetails = useQuery(api.locationServices.getEmergencyLocationDetails);
  
  // Mutation to toggle location services
  const toggleLocationServices = useMutation(api.locationServices.toggleLocationServices);

  useEffect(() => {
    // Only set loading to false when we have actual data
    if (locationStatus !== undefined && emergencyDetails !== undefined) {
      setIsLoading(false);
    }
  }, [locationStatus, emergencyDetails]);

  // Function to handle emergency calls
  const handleEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`).catch((err) =>
      Alert.alert("Error", "Could not make the call. Please check your device.")
    );
  };

  // Function to toggle location services
  const handleToggleLocationServices = async () => {
    if (locationStatus) {
      try {
        await toggleLocationServices({ enabled: !locationStatus.locationServicesEnabled });
      } catch (error) {
        Alert.alert("Error", "Failed to update location services");
      }
    }
  };

  const locationData = emergencyDetails as LocationDetails | null;

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
                onPress={() => handleEmergencyCall("811")}
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
                <Text style={styles.loadingText}>
                  Loading clinic information...
                </Text>
              </View>
            ) : locationStatus?.locationServicesEnabled && locationData ? (
              <>
                <Text style={styles.cardDescription}>{locationData.localClinic.name}</Text>
                {locationData.localClinic.distance && (
                  <Text style={styles.distanceText}>{locationData.localClinic.distance}</Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardNumber}>{locationData.localClinic.number}</Text>
                  <TouchableOpacity
                    style={[styles.callButton, styles.clinicButton]}
                    onPress={() =>
                      handleEmergencyCall(
                        locationData.localClinic.number.replace(/[^0-9]/g, "")
                      )
                    }
                  >
                    <Icon name="call" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.cardDescription}>
                Enable location services to see local clinic information
              </Text>
            )}
          </View>
        </View>

        {/* Location Information Section */}
        <Text style={styles.sectionTitle}>Your Location</Text>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Location Services</Text>
              <TouchableOpacity onPress={handleToggleLocationServices}>
                <View style={[
                  styles.statusBadge, 
                  locationStatus?.locationServicesEnabled ? styles.statusEnabled : styles.statusDisabled
                ]}>
                  <Text style={styles.statusText}>
                    {locationStatus?.locationServicesEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.locationDescription}>
              Emergency services can locate you faster with location sharing enabled
            </Text>

            {!isLoading && locationStatus?.locationServicesEnabled && locationData && (
              <View style={styles.locationDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Your approximate location:
                  </Text>
                  <Text style={styles.detailValue}>{locationData.approximateLocation}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Nearest hospital:</Text>
                  <Text style={styles.detailValue}>{locationData.nearestHospital}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Emergency response time:</Text>
                  <Text style={styles.detailValue}>{locationData.emergencyResponseTime}</Text>
                </View>
              </View>
            )}

            {!isLoading && !locationStatus?.locationServicesEnabled && (
              <TouchableOpacity 
                style={styles.enableButton}
                onPress={handleToggleLocationServices}
              >
                <Text style={styles.enableButtonText}>Enable Location Services</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Important Reminders Section */}
        <Text style={styles.sectionTitle}>Remember</Text>
        <View style={[styles.card, styles.rememberCard]}>
          <View style={styles.cardContent}>
            {[
              "Keep your phone charged for emergencies",
              "Know your exact address or GPS coordinates",
              "Have a list of current medications ready",
              "Inform family members of your health status",
            ].map((reminder, index) => (
              <View key={index} style={styles.reminderItem}>
                <View style={styles.bulletPoint} />
                <Text style={styles.reminderText}>{reminder}</Text>
              </View>
            ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    borderLeftWidth: 5,
    borderLeftColor: '#E12D2D',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  emergencyText: {
    marginLeft: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rememberCard: {
    marginBottom: 30,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  cardDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardNumber: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    backgroundColor: '#E12D2D',
  },
  healthButton: {
    backgroundColor: '#2D89E1',
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
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusEnabled: {
    backgroundColor: '#2DE16B',
  },
  statusDisabled: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    color: '#FFF',
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    fontWeight: '500',
  },
  locationDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  locationDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  detailValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  enableButton: {
    backgroundColor: '#2D89E1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  enableButtonText: {
    color: '#FFF',
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    fontWeight: '600',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E12D2D',
    marginTop: 8,
    marginRight: 12,
  },
  reminderText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});