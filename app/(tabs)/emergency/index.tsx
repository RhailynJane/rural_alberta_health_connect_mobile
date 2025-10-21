import { api } from "@/convex/_generated/api";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import * as ExpoLocation from "expo-location";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { cacheClinics, getCachedClinics } from "../../../watermelon/hooks/useCachedClinics";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import MapboxOfflineMap from "../../components/MapboxOfflineMap";
import OfflineMapDownloader from "../../components/OfflineMapDownloader";
import { FONTS } from "../../constants/constants";

// Define types for our component
interface ClinicInfo {
  name: string;
  number: string;
  address: string;
  distance?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface LocationDetails {
  approximateLocation: string;
  nearestHospital: string;
  emergencyResponseTime: string;
  localClinic: ClinicInfo;
}

interface RealTimeClinicData {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string | null;
  hours?: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  distanceText: string;
  source: string;
}

interface RealTimeClinicResponse {
  source: string;
  facilities: RealTimeClinicData[];
}

export default function Emergency() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeClinics, setRealTimeClinics] = useState<RealTimeClinicData[]>(
    []
  );
  const [showOfflineDownloader, setShowOfflineDownloader] = useState(false);
  const [mapFocus, setMapFocus] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);

  // Get location services status and emergency details
  const locationStatus = useQuery(
    api.locationServices.getLocationServicesStatus
  );
  const emergencyDetails = useQuery(
    api.locationServices.getEmergencyLocationDetails
  );
  
  // Get reminder settings
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !authLoading ? {} : "skip"
  );

  // Mutation to toggle location services
  const toggleLocationServices = useMutation(
    api.locationServices.toggleLocationServices
  );

  // Action to get real-time clinic data
  const getRealTimeClinicData = useAction(
    api.locationServices.getRealTimeClinicData
  );

  useEffect(() => {
    const loadRealTimeData = async () => {
      // Only load data if location services are enabled AND we have a location
      if (locationStatus?.locationServicesEnabled && locationStatus?.location) {
        try {
          setIsLoading(true);
          
          let latitude: number | undefined;
          let longitude: number | undefined;
          
          // First, try to get actual GPS coordinates from device
          try {
             const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
             console.log('🔐 Location permission status:', status);
            if (status === 'granted') {
              console.log('📍 Getting actual GPS location from device...');
               const location = await ExpoLocation.getCurrentPositionAsync({
                 accuracy: ExpoLocation.Accuracy.Balanced,
              });
              latitude = location.coords.latitude;
              longitude = location.coords.longitude;
              console.log(`✅ Got GPS coordinates: ${latitude}, ${longitude}`);
            } else {
              console.log('⚠️ Location permission denied, will try parsing stored location');
            }
          } catch (gpsError) {
             console.log('⚠️ Failed to get GPS location:', gpsError instanceof Error ? gpsError.message : gpsError);
          }
          
          // Fallback: Parse stored location string if GPS failed
          if (latitude === undefined || longitude === undefined) {
             console.log('🔄 Attempting to parse stored location:', locationStatus.location);
            const loc = locationStatus.location;
            if (typeof loc === 'string' && loc.includes(',')) {
              const parts = loc.split(',');
              if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (isFinite(lat) && isFinite(lng)) {
                  latitude = lat;
                  longitude = lng;
                  console.log(`📍 Using stored coordinates: ${lat}, ${lng}`);
                 } else {
                   console.log(`⚠️ Invalid stored coordinates: lat=${lat}, lng=${lng}`);
                }
              }
             } else {
               console.log(`⚠️ Stored location not in lat,lng format: "${loc}"`);
            }
          }
          
           console.log(`📤 Calling getRealTimeClinicData with location="${locationStatus.location}", latitude=${latitude}, longitude=${longitude}`);
         
          // Try fetching from Convex (online)
          const realTimeData: RealTimeClinicResponse | null =
            await getRealTimeClinicData({
              location: locationStatus.location,
              latitude,
              longitude,
            });
          
          if (realTimeData && realTimeData.facilities && realTimeData.facilities.length > 0) {
            // Success: cache for offline use and display
            setRealTimeClinics(realTimeData.facilities);
            await cacheClinics(realTimeData.facilities, locationStatus.location);
          } else {
            // Convex returned empty or failed: try offline cache
            console.log("⚠️ Convex returned no data, checking offline cache...");
            const cached = await getCachedClinics(locationStatus.location);
            if (cached.length > 0) {
              console.log("📦 Using cached clinic data");
              setRealTimeClinics(cached as RealTimeClinicData[]);
            } else {
              console.log("⚠️ No cached data available");
              setRealTimeClinics([]);
            }
          }
        } catch (error) {
          console.error("❌ Failed to fetch real-time clinic data:", error);
          
          // Network error: fallback to cache
          console.log("📦 Network error, checking offline cache...");
          const cached = await getCachedClinics(locationStatus.location);
          if (cached.length > 0) {
            console.log("📦 Using cached clinic data (offline mode)");
            setRealTimeClinics(cached as RealTimeClinicData[]);
          } else {
            console.log("⚠️ No cached data available for offline use");
            setRealTimeClinics([]);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        // If location services are disabled, ensure we're not loading
        setIsLoading(false);
        // Clear clinics if location services are turned off
        if (!locationStatus?.locationServicesEnabled) {
          setRealTimeClinics([]);
        }
      }
    };

    loadRealTimeData();
  }, [
    locationStatus?.locationServicesEnabled,
    locationStatus?.location,
    getRealTimeClinicData,
  ]);

  // Function to handle emergency calls
  const handleEmergencyCall = (number: string) => {
    const cleanNumber = number.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanNumber}`).catch((err) =>
      Alert.alert("Error", "Could not make the call. Please check your device.")
    );
  };

  // Function to open in maps
  const openInMaps = (clinic: ClinicInfo | RealTimeClinicData) => {
    if (clinic.coordinates) {
      const { latitude, longitude } = clinic.coordinates;
      const url = Platform.select({
        ios: `maps://?q=${encodeURIComponent(clinic.name)}&ll=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(clinic.name)})`,
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          // Fallback to Google Maps web
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(clinic.name)}`
          );
        });
      }
    } else if ("address" in clinic && clinic.address) {
      // Use address if coordinates not available
      const url = Platform.select({
        ios: `maps://?q=${encodeURIComponent(clinic.address)}`,
        android: `geo:0,0?q=${encodeURIComponent(clinic.address)}`,
      });

      if (url) {
        Linking.openURL(url).catch(() => {
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`
          );
        });
      }
    } else {
      Alert.alert("Info", "Map directions not available for this clinic");
    }
  };

  // Function to toggle location services
  const handleToggleLocationServices = async () => {
    if (locationStatus) {
      try {
        const newEnabledState = !locationStatus.locationServicesEnabled;
        
        // If enabling, show permission alert
        if (newEnabledState) {
          Alert.alert(
            "Enable Location Services",
            "This app would like to access your location to provide better emergency assistance and find nearby clinics.",
            [
              {
                text: "Cancel",
                style: "cancel"
              },
              {
                text: "Enable",
                onPress: async () => {
                  await toggleLocationServices({ enabled: true });
                  console.log("📍 Location services enabled");
                }
              }
            ]
          );
        } else {
          await toggleLocationServices({ enabled: false });
          console.log("📍 Location services disabled");
          // Clear real-time clinics when disabled
          setRealTimeClinics([]);
        }
      } catch (error) {
        console.error("Failed to update location services:", error);
        Alert.alert("Error", "Failed to update location services");
      }
    }
  };

  const locationData = emergencyDetails as LocationDetails | null;
  const nearestClinic = realTimeClinics[0]; // Get the closest clinic

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header (not scrollable) */}
        <CurvedHeader
          title="Emergency"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminderSettings?.enabled || false}
          reminderSettings={reminderSettings || null}
        />

        {/* Scrollable content area below header */}
        <View style={styles.contentArea}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
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
              {nearestClinic?.source && (
                <Text style={styles.dataSource}>
                  via {nearestClinic.source}
                </Text>
              )}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2A7DE1" />
                <Text style={styles.loadingText}>
                  Finding nearest clinic...
                </Text>
              </View>
            ) : locationStatus?.locationServicesEnabled && nearestClinic ? (
              <>
                <Text style={styles.clinicName}>{nearestClinic.name}</Text>
                <Text style={styles.clinicAddress}>
                  {nearestClinic.address}
                </Text>
                <Text style={styles.distanceText}>
                  {nearestClinic.distanceText} away
                </Text>
                {nearestClinic.hours ? (
                  <Text style={styles.clinicAddress}>Hours: {nearestClinic.hours}</Text>
                ) : null}

                <View style={styles.clinicActions}>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardNumber}>
                      {nearestClinic.phone || "(403) 555-0100"}
                    </Text>
                    <TouchableOpacity
                      style={[styles.callButton, styles.clinicButton]}
                      onPress={() =>
                        handleEmergencyCall(
                          nearestClinic.phone || "(403) 555-0100"
                        )
                      }
                    >
                      <Icon name="call" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.mapsButton}
                    onPress={() => openInMaps(nearestClinic)}
                  >
                    <Icon name="directions" size={20} color="#FFF" />
                    <Text style={styles.mapsButtonText}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : locationStatus?.locationServicesEnabled && locationData ? (
              // Fallback to original data if real-time data fails
              <>
                <Text style={styles.cardDescription}>
                  {locationData.localClinic.name}
                </Text>
                {locationData.localClinic.distance && (
                  <Text style={styles.distanceText}>
                    {locationData.localClinic.distance}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardNumber}>
                    {locationData.localClinic.number}
                  </Text>
                  <TouchableOpacity
                    style={[styles.callButton, styles.clinicButton]}
                    onPress={() =>
                      handleEmergencyCall(locationData.localClinic.number)
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
                <View
                  style={[
                    styles.statusBadge,
                    locationStatus?.locationServicesEnabled
                      ? styles.statusEnabled
                      : styles.statusDisabled,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {locationStatus?.locationServicesEnabled
                      ? "Enabled"
                      : "Disabled"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.locationDescription}>
              {locationStatus?.locationServicesEnabled
                ? "Location services are enabled. Emergency services can locate you faster."
                : "Enable location services for better emergency assistance and local clinic information."}
            </Text>

            {/* Show location details only when enabled */}
            {!isLoading && locationStatus?.locationServicesEnabled && (
              <View style={styles.locationDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    Your approximate location:
                  </Text>
                  <Text style={styles.detailValue}>
                    {locationStatus?.location || "Unknown"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Data source:</Text>
                  <Text style={styles.detailValue}>
                    {nearestClinic?.source || "Alberta Health Services"}
                  </Text>
                </View>
                {nearestClinic && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Clinic distance:</Text>
                    <Text style={styles.detailValue}>
                      {nearestClinic.distanceText}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Enable button when disabled */}
            {!isLoading && !locationStatus?.locationServicesEnabled && (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleToggleLocationServices}
              >
                <Icon name="location-on" size={20} color="#FFF" />
                <Text style={styles.enableButtonText}>
                  Enable Location Services
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Offline Map Section with Mapbox */}
        {locationStatus?.locationServicesEnabled && realTimeClinics.length > 0 && (
          <>
            <View style={styles.mapHeaderContainer}>
              <Text style={styles.sectionTitle}>Clinic Locations Map</Text>
              <TouchableOpacity
                style={styles.downloadMapsButton}
                onPress={() => setShowOfflineDownloader(true)}
              >
                <Icon name="cloud-download" size={20} color="#2A7DE1" />
                <Text style={styles.downloadMapsText}>Offline Maps</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.mapDescription}>
                  Interactive map showing nearby clinics. Download maps for offline use.
                </Text>
                <MapboxOfflineMap
                  clinics={realTimeClinics
                    .map((clinic) => ({
                      id: clinic.id,
                      name: clinic.name,
                      address: clinic.address,
                      hours: clinic.hours || undefined,
                      latitude: Number((clinic as any)?.coordinates?.latitude),
                      longitude: Number((clinic as any)?.coordinates?.longitude),
                      distance: clinic.distance,
                      phone: clinic.phone || undefined,
                    }))}
                  focusCenter={mapFocus}
                  userLocation={(() => {
                    try {
                      const loc = locationStatus?.location;
                      if (!loc || typeof loc !== 'string') return null;
                      const parts = loc.split(',');
                      if (parts.length < 2) return null;
                      const lat = parseFloat(parts[0]);
                      const lng = parseFloat(parts[1]);
                      if (!isFinite(lat) || !isFinite(lng)) return null;
                      return { latitude: lat, longitude: lng };
                    } catch {
                      return null;
                    }
                  })()}
                  onClinicPress={(clinic) => {
                    Alert.alert(
                      clinic.name,
                      `${clinic.address}\n\nDistance: ${clinic.distance?.toFixed(1)} km`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Call",
                          onPress: () =>
                            clinic.phone && handleEmergencyCall(clinic.phone),
                        },
                        {
                          text: "Directions",
                          onPress: () => openInMaps({
                            name: clinic.name,
                            coordinates: {
                              latitude: clinic.latitude,
                              longitude: clinic.longitude,
                            },
                          } as any),
                        },
                      ]
                    );
                  }}
                />
              </View>
            </View>
          </>
        )}

        {/* Additional Clinics Section */}
        {realTimeClinics.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Nearby Clinics</Text>
            {realTimeClinics.slice(1, 4).map((clinic, index) => (
              <View
                key={clinic.id}
                style={[styles.card, styles.additionalClinicCard]}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Text style={styles.clinicAddress}>{clinic.address}</Text>
                  <Text style={styles.distanceText}>
                    {clinic.distanceText} away
                  </Text>
                  {clinic.hours ? (
                    <Text style={styles.clinicAddress}>Hours: {clinic.hours}</Text>
                  ) : null}

                  <View style={styles.clinicActions}>
                    <View style={styles.cardFooter}>
                      <Text style={styles.additionalClinicNumber}>
                        {clinic.phone || "Phone not available"}
                      </Text>
                      {clinic.phone && (
                        <TouchableOpacity
                          style={[styles.callButton, styles.clinicButton]}
                          onPress={() => handleEmergencyCall(clinic.phone!)}
                        >
                          <Icon name="call" size={16} color="#FFF" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.mapsButton, styles.smallMapsButton]}
                      onPress={() => openInMaps(clinic)}
                    >
                      <Icon name="directions" size={16} color="#FFF" />
                      <Text style={styles.smallMapsButtonText}>Maps</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

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
        </View>
      </CurvedBackground>
      <BottomNavigation />
      
      <OfflineMapDownloader 
        visible={showOfflineDownloader} 
        onClose={() => setShowOfflineDownloader(false)}
        onRegionDownloaded={(center) => {
          setShowOfflineDownloader(false);
          setMapFocus(center);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    borderLeftWidth: 5,
    borderLeftColor: "#E12D2D",
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
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
  additionalClinicCard: {
    marginBottom: 12,
  },
  rememberCard: {
    marginBottom: 30,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  dataSource: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  cardDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  mapDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  clinicName: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  clinicAddress: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cardNumber: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  additionalClinicNumber: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#333",
    flex: 1,
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
    backgroundColor: "#2DE16B",
  },
  distanceText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  loadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    color: "#666",
    fontStyle: "italic",
    marginLeft: 10,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  locationTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusEnabled: {
    backgroundColor: "#2DE16B",
  },
  statusDisabled: {
    backgroundColor: "#FF6B6B",
  },
  statusText: {
    color: "#FFF",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    fontWeight: "500",
  },
  locationDescription: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  locationDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  detailLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginRight: 5,
    flex: 1,
  },
  detailValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  enableButton: {
    flexDirection: "row",
    backgroundColor: "#2D89E1",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  enableButtonText: {
    color: "#FFF",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  clinicActions: {
    marginTop: 12,
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285F4", // Google Maps blue
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  smallMapsButton: {
    padding: 8,
  },
  mapsButtonText: {
    color: "#FFF",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  smallMapsButtonText: {
    color: "#FFF",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E12D2D",
    marginTop: 8,
    marginRight: 12,
  },
  reminderText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  mapHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  downloadMapsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "rgba(42, 125, 225, 0.1)",
  },
  downloadMapsText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 12,
    color: "#2A7DE1",
    marginLeft: 6,
  },
});
