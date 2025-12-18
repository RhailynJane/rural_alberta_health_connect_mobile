import { api } from "@/convex/_generated/api";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import * as ExpoLocation from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getCachedClinics, cacheClinics } from "../../watermelon/hooks/useCachedClinics";
import MapboxOfflineMap from "../components/MapboxOfflineMap";
import OfflineMapDownloader from "../components/OfflineMapDownloader";
import { FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Clinic {
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

interface FilterState {
  clinicType: "all" | "walk-in" | "urgent-care" | "specialist";
  openNow: boolean;
  is24Hours: boolean;
}

export default function FindCareClinics() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { isOnline } = useNetworkStatus();

  const [isLoading, setIsLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    clinicType: "all",
    openNow: false,
    is24Hours: false,
  });
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showOfflineDownloader, setShowOfflineDownloader] = useState(false);
  const [mapFocusCenter, setMapFocusCenter] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);

  const locationStatus = useQuery(
    api.locationServices.getLocationServicesStatus,
    isAuthenticated && !authLoading ? {} : "skip"
  );

  const getRealTimeClinicData = useAction(
    api.locationServices.getRealTimeClinicData
  );

  // Load clinics
  useEffect(() => {
    const loadClinics = async () => {
      setIsLoading(true);
      try {
        // Get user location
        let latitude: number | undefined;
        let longitude: number | undefined;

        const loc = locationStatus?.location;
        if (typeof loc === "string" && loc.includes(",")) {
          const parts = loc.split(",");
          if (parts.length >= 2) {
            latitude = parseFloat(parts[0]);
            longitude = parseFloat(parts[1]);
          }
        }

        if (!latitude || !longitude) {
          const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const location = await ExpoLocation.getCurrentPositionAsync({
              accuracy: ExpoLocation.Accuracy.Low,
            });
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            // Save device location for map display
            setDeviceLocation({ latitude, longitude });
          }
        }

        if (!isOnline) {
          const cached = await getCachedClinics(locationStatus?.location || "");
          setClinics(cached as Clinic[]);
          setIsLoading(false);
          return;
        }

        if (latitude && longitude && locationStatus?.location) {
          const data = await getRealTimeClinicData({
            location: locationStatus.location,
            latitude,
            longitude,
          });

          if (data?.facilities) {
            setClinics(data.facilities as Clinic[]);
            await cacheClinics(data.facilities, locationStatus.location);
          }
        }
      } catch (error) {
        console.error("Failed to load clinics:", error);
        const cached = await getCachedClinics(locationStatus?.location || "");
        setClinics(cached as Clinic[]);
      } finally {
        setIsLoading(false);
      }
    };

    if (locationStatus !== undefined) {
      loadClinics();
    }
  }, [locationStatus, isOnline]);

  // Filter clinics based on filter state
  const filteredClinics = clinics.filter((clinic) => {
    // TODO: Implement actual filtering when we have real data for hours
    return true;
  });

  const activeFilterCount =
    (filters.openNow ? 1 : 0) +
    (filters.is24Hours ? 1 : 0) +
    (filters.clinicType !== "all" ? 1 : 0);

  // Handle clinic selection - focus map and expand card
  const handleClinicSelect = useCallback((clinic: Clinic) => {
    const isAlreadySelected = selectedClinic?.id === clinic.id;

    if (isAlreadySelected) {
      // Deselect if tapping same clinic
      setSelectedClinic(null);
      setMapFocusCenter(null);
    } else {
      // Select and focus map
      setSelectedClinic(clinic);
      if (clinic.coordinates?.latitude && clinic.coordinates?.longitude) {
        setMapFocusCenter({
          latitude: clinic.coordinates.latitude,
          longitude: clinic.coordinates.longitude,
          zoom: 14,
        });
      }
    }
  }, [selectedClinic]);

  // Handle call action
  const handleCall = useCallback((phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      console.error("Failed to open phone dialer");
    });
  }, []);

  // Handle directions action
  const handleDirections = useCallback((clinic: Clinic) => {
    const { latitude, longitude } = clinic.coordinates;
    const label = encodeURIComponent(clinic.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      });
    }
  }, []);

  const renderClinicCard = useCallback(
    ({ item }: { item: Clinic }) => {
      const isSelected = selectedClinic?.id === item.id;
      return (
        <TouchableOpacity
          style={[styles.clinicCard, isSelected && styles.clinicCardSelected]}
          onPress={() => handleClinicSelect(item)}
          activeOpacity={0.7}
        >
          {/* Header Row */}
          <View style={styles.clinicCardHeader}>
            <Text style={styles.clinicName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{item.distanceText}</Text>
            </View>
          </View>

          {/* Address */}
          <Text style={styles.clinicAddress} numberOfLines={isSelected ? 2 : 1}>
            {item.address}
          </Text>

          {/* Status Row */}
          <View style={styles.clinicMeta}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Open</Text>
            </View>
            <Text style={styles.clinicType}>{item.type || "Walk-in"}</Text>
          </View>

          {/* Expanded Details - shown when selected */}
          {isSelected && (
            <View style={styles.expandedDetails}>
              {/* Phone */}
              {item.phone && (
                <View style={styles.detailRow}>
                  <Icon name="phone" size={18} color="#64748B" />
                  <Text style={styles.detailText}>{item.phone}</Text>
                </View>
              )}

              {/* Hours */}
              {item.hours && (
                <View style={styles.detailRow}>
                  <Icon name="schedule" size={18} color="#64748B" />
                  <Text style={styles.detailText}>{item.hours}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {item.phone && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall(item.phone!)}
                  >
                    <Icon name="phone" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => handleDirections(item)}
                >
                  <Icon name="directions" size={20} color="#0EA5E9" />
                  <Text style={styles.actionButtonTextSecondary}>Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedClinic, handleClinicSelect, handleCall, handleDirections]
  );

  // Use locationStatus from Convex, fallback to device GPS location
  const userLocation = (() => {
    try {
      const loc = locationStatus?.location;
      if (loc && typeof loc === "string") {
        const parts = loc.split(",");
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (isFinite(lat) && isFinite(lng)) {
            return { latitude: lat, longitude: lng };
          }
        }
      }
      // Fallback to device location from GPS
      return deviceLocation;
    } catch {
      return deviceLocation;
    }
  })();

  return (
    <View style={styles.container}>
      {/* Full-bleed Map */}
      <View style={styles.mapContainer}>
        <MapboxOfflineMap
          clinics={filteredClinics.map((c) => ({
            id: c.id,
            name: c.name,
            address: c.address,
            latitude: c.coordinates?.latitude,
            longitude: c.coordinates?.longitude,
            distance: c.distance,
            phone: c.phone || undefined,
          }))}
          userLocation={userLocation}
          focusCenter={mapFocusCenter}
          topOffset={insets.top + 12}
          onClinicPress={(clinic) => {
            const found = filteredClinics.find((c) => c.id === clinic.id);
            if (found) handleClinicSelect(found);
          }}
        />

        {/* Floating Back Button - Glass Style */}
        <TouchableOpacity
          style={[styles.floatingButton, { top: insets.top + 12, left: 16 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={22} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, filters.openNow && styles.filterPillActive]}
          onPress={() =>
            setFilters((prev) => ({ ...prev, openNow: !prev.openNow }))
          }
        >
          <Text
            style={[
              styles.filterPillText,
              filters.openNow && styles.filterPillTextActive,
            ]}
          >
            Open now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            filters.is24Hours && styles.filterPillActive,
          ]}
          onPress={() =>
            setFilters((prev) => ({ ...prev, is24Hours: !prev.is24Hours }))
          }
        >
          <Text
            style={[
              styles.filterPillText,
              filters.is24Hours && styles.filterPillTextActive,
            ]}
          >
            24/7
          </Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Offline Download Button */}
        <TouchableOpacity
          style={styles.offlineButton}
          onPress={() => setShowOfflineDownloader(true)}
        >
          <Icon name="download" size={18} color="#64748B" />
          <Text style={styles.offlineButtonText}>Offline</Text>
        </TouchableOpacity>
      </View>

      {/* Results List */}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.loadingText}>Finding clinics near you...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredClinics}
            keyExtractor={(item) => item.id}
            renderItem={renderClinicCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="search-off" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No clinics found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filters
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Offline Map Downloader Modal */}
      <OfflineMapDownloader
        visible={showOfflineDownloader}
        onClose={() => setShowOfflineDownloader(false)}
        onRegionDownloaded={(center) => {
          setMapFocusCenter(center);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.45,
    position: "relative",
  },
  floatingButton: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: "#E0F2FE",
  },
  filterPillText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#0EA5E9",
    fontWeight: "600",
  },
  offlineButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 4,
  },
  offlineButtonText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: "#64748B",
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#64748B",
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  clinicCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  clinicCardSelected: {
    borderColor: "#0EA5E9",
    borderWidth: 2,
  },
  clinicCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  clinicName: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 17,
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  distanceText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: "#64748B",
  },
  clinicAddress: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#64748B",
    marginBottom: 10,
  },
  clinicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: "#10B981",
    fontWeight: "500",
  },
  clinicType: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: "#94A3B8",
  },
  // Expanded details styles
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: "#E0F2FE",
  },
  actionButtonText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  actionButtonTextSecondary: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: "#0EA5E9",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: "#64748B",
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#94A3B8",
  },
});
