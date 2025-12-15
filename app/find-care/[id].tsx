import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Dimensions,
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
import MapboxOfflineMap from "../components/MapboxOfflineMap";
import { FONTS } from "../constants/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  hours?: string | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  distanceText?: string;
}

export default function ClinicDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const clinic: Clinic | null = useMemo(() => {
    try {
      if (params.clinic) {
        return JSON.parse(params.clinic as string);
      }
      return null;
    } catch {
      return null;
    }
  }, [params.clinic]);

  if (!clinic) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#CBD5E1" />
          <Text style={styles.errorText}>Clinic not found</Text>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCall = () => {
    if (clinic.phone) {
      Linking.openURL(`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`);
    }
  };

  const handleDirections = () => {
    if (clinic.coordinates) {
      const { latitude, longitude } = clinic.coordinates;
      const url = Platform.select({
        ios: `maps://?q=${encodeURIComponent(clinic.name)}&ll=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(clinic.name)})`,
      });
      if (url) {
        Linking.openURL(url).catch(() => {
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          );
        });
      }
    }
  };

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {clinic.name}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapboxOfflineMap
            clinics={[
              {
                id: clinic.id,
                name: clinic.name,
                address: clinic.address,
                latitude: clinic.coordinates?.latitude || 0,
                longitude: clinic.coordinates?.longitude || 0,
                distance: clinic.distance,
                phone: clinic.phone || undefined,
              },
            ]}
            userLocation={null}
            focusCenter={
              clinic.coordinates
                ? {
                    latitude: clinic.coordinates.latitude,
                    longitude: clinic.coordinates.longitude,
                    zoom: 14,
                  }
                : null
            }
          />
        </View>

        {/* Clinic Info */}
        <View style={styles.infoSection}>
          <Text style={styles.clinicName}>{clinic.name}</Text>

          {clinic.distanceText && (
            <View style={styles.distanceBadge}>
              <Icon name="near-me" size={14} color="#64748B" />
              <Text style={styles.distanceText}>{clinic.distanceText} away</Text>
            </View>
          )}

          {/* Address */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="place" size={20} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{clinic.address}</Text>
            </View>
          </View>

          {/* Hours */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="schedule" size={20} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Hours</Text>
              <Text style={styles.infoValue}>
                {clinic.hours || "Contact for hours"}
              </Text>
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Open now</Text>
              </View>
            </View>
          </View>

          {/* Phone */}
          {clinic.phone && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="phone" size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{clinic.phone}</Text>
              </View>
            </View>
          )}

          {/* Services */}
          <View style={styles.servicesSection}>
            <Text style={styles.servicesTitle}>Services</Text>
            <View style={styles.servicesTags}>
              <View style={styles.serviceTag}>
                <Text style={styles.serviceTagText}>Walk-in</Text>
              </View>
              <View style={styles.serviceTag}>
                <Text style={styles.serviceTagText}>General Practice</Text>
              </View>
              <View style={styles.serviceTag}>
                <Text style={styles.serviceTagText}>Minor Injuries</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={handleDirections}
          activeOpacity={0.8}
        >
          <Icon name="directions" size={22} color="#0EA5E9" />
          <Text style={styles.secondaryActionText}>Directions</Text>
        </TouchableOpacity>

        {clinic.phone && (
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Icon name="phone" size={22} color="#0EA5E9" />
            <Text style={styles.secondaryActionText}>Call</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => {
            // Could add to recent/favorites or navigate to booking
            router.back();
          }}
          activeOpacity={0.9}
        >
          <Icon name="check-circle" size={22} color="#FFF" />
          <Text style={styles.primaryActionText}>Choose this clinic</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    fontSize: 18,
    color: "#0F172A",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.28,
  },
  infoSection: {
    padding: 20,
  },
  clinicName: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 26,
    color: "#0F172A",
    marginBottom: 8,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  distanceText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: "#64748B",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#334155",
    lineHeight: 22,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
  },
  servicesSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  servicesTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: "#334155",
    marginBottom: 12,
  },
  servicesTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceTag: {
    backgroundColor: "#F0F9FF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  serviceTagText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: "#0369A1",
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    gap: 6,
  },
  secondaryActionText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 15,
    color: "#0EA5E9",
    fontWeight: "600",
  },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#0EA5E9",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#0EA5E9",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryActionText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 18,
    color: "#64748B",
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: "#0EA5E9",
  },
});
