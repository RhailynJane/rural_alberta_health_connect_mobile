import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import * as ExpoLocation from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getCachedClinics, cacheClinics } from "../../watermelon/hooks/useCachedClinics";
import MapboxOfflineMap from "../components/MapboxOfflineMap";
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
  const params = useLocalSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { isOnline } = useNetworkStatus();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    clinicType: "all",
    openNow: false,
    is24Hours: false,
  });

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

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !clinic.name.toLowerCase().includes(query) &&
        !clinic.address.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    // Add more filter logic here based on filters state
    return true;
  });

  const activeFilterCount =
    (filters.openNow ? 1 : 0) +
    (filters.is24Hours ? 1 : 0) +
    (filters.clinicType !== "all" ? 1 : 0);

  const renderClinicCard = useCallback(
    ({ item }: { item: Clinic }) => {
      const isSelected = selectedClinic?.id === item.id;
      return (
        <TouchableOpacity
          style={[styles.clinicCard, isSelected && styles.clinicCardSelected]}
          onPress={() => {
            setSelectedClinic(item);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.clinicCardHeader}>
            <Text style={styles.clinicName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{item.distanceText}</Text>
            </View>
          </View>

          <Text style={styles.clinicAddress} numberOfLines={1}>
            {item.address}
          </Text>

          <View style={styles.clinicMeta}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Open</Text>
            </View>
            <Text style={styles.clinicType}>Walk-in</Text>
          </View>

          {isSelected && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() =>
                router.push({
                  pathname: "/find-care/[id]",
                  params: { id: item.id, clinic: JSON.stringify(item) },
                })
              }
            >
              <Text style={styles.viewDetailsText}>View details</Text>
              <Icon name="chevron-right" size={18} color="#0EA5E9" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [selectedClinic, router]
  );

  const userLocation = (() => {
    try {
      const loc = locationStatus?.location;
      if (!loc || typeof loc !== "string") return null;
      const parts = loc.split(",");
      if (parts.length < 2) return null;
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isFinite(lat) || !isFinite(lng)) return null;
      return { latitude: lat, longitude: lng };
    } catch {
      return null;
    }
  })();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Care</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter city, postal code, or address"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.locationButton}>
          <Icon name="my-location" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* Map */}
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
          onClinicPress={(clinic) => {
            const found = filteredClinics.find((c) => c.id === clinic.id);
            if (found) setSelectedClinic(found);
          }}
        />
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilterCount > 0 && styles.filterPillActive,
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Icon
            name="tune"
            size={18}
            color={activeFilterCount > 0 ? "#0EA5E9" : "#64748B"}
          />
          <Text
            style={[
              styles.filterPillText,
              activeFilterCount > 0 && styles.filterPillTextActive,
            ]}
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </TouchableOpacity>

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
                  Try adjusting your search or filters
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 20,
    color: "#0F172A",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#334155",
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.32,
  },
  filterRow: {
    flexDirection: "row",
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
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 4,
  },
  viewDetailsText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: "#0EA5E9",
    fontWeight: "600",
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
