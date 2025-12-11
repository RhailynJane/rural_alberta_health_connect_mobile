import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import * as ExpoLocation from "expo-location";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { cacheClinics, getCachedClinics } from "../../../watermelon/hooks/useCachedClinics";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import MapboxOfflineMap from "../../components/MapboxOfflineMap";
import OfflineMapDownloader from "../../components/OfflineMapDownloader";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

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
  const { isOnline } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeClinics, setRealTimeClinics] = useState<RealTimeClinicData[]>(
    []
  );
  const [showOfflineDownloader, setShowOfflineDownloader] = useState(false);
  const [mapFocus, setMapFocus] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);
  
  // Local state for location services toggle (for instant UI updates)
  const [localLocationEnabled, setLocalLocationEnabled] = useState<boolean | null>(null);

    // Track previous online state to detect transitions
    const prevIsOnlineRef = useRef<boolean | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalMessage, setModalMessage] = useState<string>("");
  const [modalButtons, setModalButtons] = useState<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'destructive' }[]>([]);

  // Force refetch on screen focus
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get location services status and emergency details (allow offline access via cache)
  const locationStatus = useQuery(
    api.locationServices.getLocationServicesStatus,
    isAuthenticated && !authLoading ? {} : "skip"
  );
  const emergencyDetails = useQuery(
    api.locationServices.getEmergencyLocationDetails,
    isAuthenticated && !authLoading ? {} : "skip"
  );
  
  // Get reminder settings (allow offline access via cache)
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !authLoading && refreshTrigger !== -1 ? {} : "skip"
  );

  // Get user profile with emergency contact (allow offline access via cache)
  const profile = useQuery(
    (api as any)["profile/personalInformation"].getProfile,
    isAuthenticated && !authLoading && refreshTrigger !== -1 ? {} : "skip"
  );

  // Mutation to toggle location services (only when online)
  const toggleLocationServices = useMutation(
    api.locationServices.toggleLocationServices
  );

  // Action to get real-time clinic data (only when online)
  const getRealTimeClinicData = useAction(
    api.locationServices.getRealTimeClinicData
  );

  // Initialize local location enabled state from cache on mount
  useEffect(() => {
    const LOCATION_STATUS_CACHE_KEY = "@app_settings_location_enabled";
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(LOCATION_STATUS_CACHE_KEY);
        if (cached !== null) {
          setLocalLocationEnabled(cached === "1");
          console.log(`📍 [Emergency] Loaded cached location status on mount: ${cached === "1" ? "enabled" : "disabled"}`);
        }
      } catch (err) {
        console.error("Failed to load cached location status:", err);
      }
    })();
  }, []);

  // Reload cache when screen comes into focus (navigating back to this screen)
  useFocusEffect(
    useCallback(() => {
      const LOCATION_STATUS_CACHE_KEY = "@app_settings_location_enabled";
      console.log(`📍 [Emergency] Screen focused - reloading cache...`);
      (async () => {
        try {
          const cached = await AsyncStorage.getItem(LOCATION_STATUS_CACHE_KEY);
          console.log(`📍 [Emergency] Cache value read: "${cached}"`);
          if (cached !== null) {
            const newValue = cached === "1";
            setLocalLocationEnabled(newValue);
            console.log(`📍 [Emergency] Set local state to: ${newValue ? "enabled" : "disabled"}`);
          } else {
            console.log(`📍 [Emergency] No cached value found`);
          }
        } catch (err) {
          console.error("Failed to reload cached location status:", err);
        }
      })();
      // Also force refresh reminder settings and profile when screen comes into focus
      setRefreshTrigger(prev => prev + 1);
      console.log(`🔔 [Emergency] Screen focused - reminder settings and profile will be refetched from server`);
    }, [])
  );

    // ONLY sync from server when we TRANSITION to online (not on every query update)
    // This prevents stale query from racing with focus effect and overwriting offline changes
  useEffect(() => {
      const wasOffline = prevIsOnlineRef.current === false;
      const isNowOnline = isOnline === true;
    
      // Update ref for next render
      prevIsOnlineRef.current = isOnline;
    
      // ONLY sync when we transition FROM offline TO online
      if (wasOffline && isNowOnline && locationStatus !== undefined) {
        const val = !!locationStatus.locationServicesEnabled;
        console.log(`📍 [Emergency] Online transition detected - syncing from server: ${val ? "enabled" : "disabled"}`);
      setLocalLocationEnabled(!!locationStatus.locationServicesEnabled);
      } else {
        console.log(`📍 [Emergency] Sync skipped - wasOffline: ${wasOffline}, isNowOnline: ${isNowOnline}, locationStatus: ${locationStatus !== undefined ? "defined" : "undefined"}`);
    }
  }, [locationStatus, isOnline]);

  // Compute the effective location enabled state (prefer local state for instant updates)
  // When offline, default to false if cache hasn't loaded yet to prevent showing stale data
  const effectiveLocationEnabled = localLocationEnabled !== null 
    ? localLocationEnabled 
    : (isOnline ? (locationStatus?.locationServicesEnabled ?? false) : false);

  useEffect(() => {
    const loadRealTimeData = async () => {
      // CRITICAL: Clear clinics immediately if location services are disabled
      if (!effectiveLocationEnabled) {
        console.log("📍 Location services disabled - clearing clinics");
        setRealTimeClinics([]);
        setIsLoading(false);
        return;
      }

      // If offline, try to load cached data immediately
      if (!isOnline) {
        console.log("📴 Offline mode: loading cached clinic data");
        try {
          setIsLoading(true);
          const cached = await getCachedClinics(locationStatus?.location || "");
          if (cached.length > 0) {
            console.log("📦 Using cached clinic data (offline)");
            setRealTimeClinics(cached as RealTimeClinicData[]);
          } else {
            console.log("⚠️ No cached data available (offline)");
            setRealTimeClinics([]);
          }
        } catch (error) {
          console.error("❌ Failed to load cached clinics:", error);
          setRealTimeClinics([]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Only load data if location services are enabled AND we have a location AND we're online
      if (effectiveLocationEnabled && locationStatus?.location && isOnline) {
        try {
          setIsLoading(true);
          
          let latitude: number | undefined;
          let longitude: number | undefined;
          
          // First, check if we have a stored location to use immediately
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
              }
            }
          }
          
          // Only try GPS if we don't have stored coordinates (first-time setup)
          if (latitude === undefined || longitude === undefined) {
            try {
              const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
              console.log('🔐 Location permission status:', status);
              if (status === 'granted') {
                console.log('📍 Getting GPS location from device...');
                const location = await ExpoLocation.getCurrentPositionAsync({
                  accuracy: ExpoLocation.Accuracy.Low, // Use Low for faster results
                });
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
                console.log(`✅ Got GPS coordinates: ${latitude}, ${longitude}`);
              } else {
                console.log('⚠️ Location permission denied');
              }
            } catch (gpsError) {
              console.log('⚠️ Failed to get GPS location:', gpsError instanceof Error ? gpsError.message : gpsError);
            }
          }
          
          if (latitude === undefined || longitude === undefined) {
            console.log(`⚠️ No coordinates available`);
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
        // If we reach here, location services are enabled but no location data yet
        setIsLoading(false);
      }
    };

    loadRealTimeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveLocationEnabled,
    locationStatus?.location,
    // getRealTimeClinicData removed - it's a Convex action and causes infinite loops
    isOnline,
  ]);

  // Function to handle emergency calls
  const handleEmergencyCall = (number: string) => {
    const cleanNumber = number.replace(/[^0-9+]/g, "");
    
    // For 911, show immediate confirmation with clear cancel option
    if (cleanNumber === "911") {
      setModalTitle("⚠️ Call 911 Emergency?");
      setModalMessage("You are about to call emergency services (911). This should only be used for life-threatening emergencies.\n\nCall 911 if:\n• Someone's life is in danger\n• Medical emergency requiring immediate attention\n• Fire or serious accident\n\nFor non-emergencies, use Health Link 811 instead.");
      setModalButtons([
        { 
          label: "Cancel", 
          onPress: () => setModalVisible(false), 
          variant: 'secondary' 
        },
        { 
          label: "Call 911 Now", 
          onPress: () => {
            setModalVisible(false);
            Linking.openURL(`tel:${cleanNumber}`).catch((err) => {
              setModalTitle("Error");
              setModalMessage("Could not make the call. Please check your device.");
              setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
              setModalVisible(true);
            });
          }, 
          variant: 'destructive' 
        },
      ]);
      setModalVisible(true);
      return;
    }
    
    // For 811, show confirmation with health advice context
    if (cleanNumber === "811") {
      setModalTitle("📞 Call Health Link 811?");
      setModalMessage("You are about to call Health Link Alberta (811) for 24/7 health advice from registered nurses.\n\nUse 811 for:\n• Health questions and concerns\n• Advice on medications\n• Help deciding if you need to see a doctor\n• Finding health services in your area\n\nThis is a free service available 24 hours a day.");
      setModalButtons([
        { 
          label: "Cancel", 
          onPress: () => setModalVisible(false), 
          variant: 'secondary' 
        },
        { 
          label: "Call 811", 
          onPress: () => {
            setModalVisible(false);
            Linking.openURL(`tel:${cleanNumber}`).catch((err) => {
              setModalTitle("Error");
              setModalMessage("Could not make the call. Please check your device.");
              setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
              setModalVisible(true);
            });
          }, 
          variant: 'primary' 
        },
      ]);
      setModalVisible(true);
      return;
    }
    
    // For other numbers (clinics), proceed directly
    Linking.openURL(`tel:${cleanNumber}`).catch((err) => {
      setModalTitle("Error");
      setModalMessage("Could not make the call. Please check your device.");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    });
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
      setModalTitle("Info");
      setModalMessage("Map directions not available for this clinic");
      setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
      setModalVisible(true);
    }
  };

  // Function to toggle location services
  const handleToggleLocationServices = async () => {
    if (locationStatus) {
      try {
        const newEnabledState = !effectiveLocationEnabled;
        const LOCATION_STATUS_CACHE_KEY = "@app_settings_location_enabled";
        
        // If enabling, show permission modal
        if (newEnabledState) {
          setModalTitle("Enable Location Services");
          setModalMessage("This app would like to access your location to provide better emergency assistance and find nearby clinics.");
          setModalButtons([
            { 
              label: "Cancel", 
              onPress: () => setModalVisible(false), 
              variant: 'secondary' 
            },
            { 
              label: "Enable", 
              onPress: async () => {
                setModalVisible(false);
                try {
                  // Update local state immediately for instant UI feedback
                  setLocalLocationEnabled(true);
                  // Update cache immediately for instant UI sync with App Settings
                  await AsyncStorage.setItem(LOCATION_STATUS_CACHE_KEY, "1");
                  
                  // Only update server if online
                  if (!isOnline) {
                    console.log("📴 Offline: location setting saved locally, will sync when online");
                    return;
                  }
                  
                  await toggleLocationServices({ enabled: true });
                  console.log("📍 Location services enabled");
                } catch (err) {
                  console.error("Failed to enable location services:", err);
                  // Revert local state on error
                  setLocalLocationEnabled(false);
                  setModalTitle("Error");
                  setModalMessage("Failed to enable location services");
                  setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
                  setModalVisible(true);
                }
              }, 
              variant: 'primary' 
            }
          ]);
          setModalVisible(true);
        } else {
          // Update local state immediately for instant UI feedback
          setLocalLocationEnabled(false);
          // Update cache immediately for instant UI sync with App Settings
          await AsyncStorage.setItem(LOCATION_STATUS_CACHE_KEY, "0");
          console.log("📍 Location services disabled (cache updated)");
          
          // Clear real-time clinics when disabled
          setRealTimeClinics([]);
          
          // Only update server if online
          if (!isOnline) {
            console.log("� Offline: location setting saved locally, will sync when online");
            return;
          }
          
          await toggleLocationServices({ enabled: false });
          console.log("📍 Location services disabled (server updated)");
        }
      } catch (error) {
        console.error("Failed to update location services:", error);
        setModalTitle("Error");
        setModalMessage("Failed to update location services");
        setModalButtons([{ label: "OK", onPress: () => setModalVisible(false), variant: 'primary' }]);
        setModalVisible(true);
      }
    }
  };

  const locationData = emergencyDetails as LocationDetails | null;
  const nearestClinic = realTimeClinics[0]; // Get the closest clinic

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={120} />
        
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

        {/* My Emergency Contact Card */}
        {profile?.emergencyContactName && profile?.emergencyContactPhone && (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Icon name="person" size={24} color="#9B59B6" />
                <Text style={styles.cardTitle}>My Emergency Contact</Text>
              </View>
              <Text style={styles.clinicName}>{profile.emergencyContactName}</Text>
              <Text style={styles.cardDescription}>
                Personal emergency contact
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardNumber}>{profile.emergencyContactPhone}</Text>
                <TouchableOpacity
                  style={[styles.callButton, styles.personalContactButton]}
                  onPress={() => handleEmergencyCall(profile.emergencyContactPhone!)}
                >
                  <Icon name="call" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Local Clinic Card */}
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Icon name="local-pharmacy" size={24} color="#2DE16B" />
              <Text style={styles.cardTitle}>Local Clinic</Text>
              <View style={styles.headerRightRow}>
                {nearestClinic?.source && (
                  <Text style={styles.dataSource}>
                    via {nearestClinic.source}
                  </Text>
                )}
                {nearestClinic?.source && String(nearestClinic.source).toLowerCase().includes('cached') && (
                  <View style={styles.cachedPill}>
                    <Text style={styles.cachedPillText}>Cached</Text>
                  </View>
                )}
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2A7DE1" />
                <Text style={styles.loadingText}>
                  Finding nearest clinic...
                </Text>
              </View>
            ) : effectiveLocationEnabled && nearestClinic ? (
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
            ) : effectiveLocationEnabled && locationData ? (
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
                    effectiveLocationEnabled
                      ? styles.statusEnabled
                      : styles.statusDisabled,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {effectiveLocationEnabled
                      ? "Enabled"
                      : "Disabled"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.locationDescription}>
              {effectiveLocationEnabled
                ? "Location services are enabled. Emergency services can locate you faster."
                : "Enable location services for better emergency assistance and local clinic information."}
            </Text>

            {/* Show location details only when enabled */}
            {!isLoading && effectiveLocationEnabled && (
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
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Data status:</Text>
                  <Text style={styles.detailValue}>
                    {nearestClinic?.source && String(nearestClinic.source).toLowerCase().includes('cached')
                      ? 'Cached data'
                      : 'Live data'}
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
            {!isLoading && !effectiveLocationEnabled && (
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

        {/* Offline Map Section with Mapbox - Always visible for offline map downloads */}
        <>
          <View style={styles.mapHeaderContainer}>
            <Text style={styles.sectionTitle}>
              {effectiveLocationEnabled && realTimeClinics.length > 0 
                ? "Clinic Locations Map" 
                : "Offline Maps"}
            </Text>
            <TouchableOpacity
              style={styles.downloadMapsButton}
              onPress={() => setShowOfflineDownloader(true)}
            >
              <Icon name="cloud-download" size={20} color="#2A7DE1" />
              <Text style={styles.downloadMapsText}>Download Maps</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.mapDescription}>
                {effectiveLocationEnabled && realTimeClinics.length > 0
                  ? "Interactive map showing nearby clinics. Download maps for offline use. When offline, the map tiles load from your downloads and clinic markers use your last saved results. Opening directions may require connectivity."
                  : "Download offline maps for areas with poor connectivity. When offline, the Emergency map will use your downloaded tiles automatically. Clinic markers use your last saved results; directions may require connectivity. Enable location services to see nearby clinics."}
              </Text>
              <MapboxOfflineMap
                clinics={effectiveLocationEnabled && realTimeClinics.length > 0
                  ? realTimeClinics.map((clinic) => ({
                      id: clinic.id,
                      name: clinic.name,
                      address: clinic.address,
                      hours: clinic.hours || undefined,
                      latitude: Number((clinic as any)?.coordinates?.latitude),
                      longitude: Number((clinic as any)?.coordinates?.longitude),
                      distance: clinic.distance,
                      phone: clinic.phone || undefined,
                    }))
                  : []}
                focusCenter={mapFocus}
                userLocation={effectiveLocationEnabled ? (() => {
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
                })() : null}
                onClinicPress={(clinic) => {
                  setModalTitle(clinic.name);
                  setModalMessage(`${clinic.address}\n\nDistance: ${clinic.distance?.toFixed(1)} km`);
                  setModalButtons([
                    { text: "Cancel", onPress: () => setModalVisible(false), variant: 'secondary' },
                    {
                      label: "Call",
                      onPress: () => {
                        setModalVisible(false);
                        clinic.phone && handleEmergencyCall(clinic.phone);
                      },
                      variant: 'primary',
                    },
                    {
                      label: "Directions",
                      onPress: () => {
                        setModalVisible(false);
                        openInMaps({
                          name: clinic.name,
                          coordinates: {
                            latitude: clinic.latitude,
                            longitude: clinic.longitude,
                          },
                        } as any);
                      },
                      variant: 'primary',
                    },
                  ] as any);
                  setModalVisible(true);
                }}
              />
            </View>
          </View>
        </>

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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cachedPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDBA74', // amber-300
    backgroundColor: '#FFFBEB', // amber-50
  },
  cachedPillText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 10,
    color: '#92400E', // amber-800
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
  personalContactButton: {
    backgroundColor: "#9B59B6",
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
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  statusLive: {
    backgroundColor: '#ECFDF5', // emerald-50
    borderColor: '#34D399', // emerald-400
  },
  statusCached: {
    backgroundColor: '#FFFBEB', // amber-50
    borderColor: '#FBBF24', // amber-400
  },
  statusChipText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 12,
  },
  statusLiveText: {
    color: '#065F46', // emerald-800
  },
  statusCachedText: {
    color: '#92400E', // amber-800
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
  detailItemInline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginRight: 5,
    flex: 1,
  },
  detailLabelInline: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#666",
    marginRight: 8,
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
