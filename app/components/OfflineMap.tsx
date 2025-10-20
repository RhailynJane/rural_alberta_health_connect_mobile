import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import Icon from "react-native-vector-icons/MaterialIcons";
import { FONTS } from "../constants/constants";

interface OfflineMapProps {
  clinics?: {
    id: string;
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
    phone?: string | null;
    distance?: number;
    distanceText?: string;
  }[];
  initialRegion?: Region;
  onMarkerPress?: (clinicId: string) => void;
  height?: number;
}

// Default region for Alberta (centered around Calgary/Edmonton region)
const DEFAULT_ALBERTA_REGION: Region = {
  latitude: 51.0447,
  longitude: -114.0719,
  latitudeDelta: 2.0,
  longitudeDelta: 2.0,
};

export default function OfflineMap({
  clinics = [],
  initialRegion = DEFAULT_ALBERTA_REGION,
  onMarkerPress,
  height = 300,
}: OfflineMapProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [isMapReady, setIsMapReady] = useState(false);

  const fitToMarkers = useCallback(() => {
    if (clinics.length === 0 || !mapRef.current) return;

    // If only one clinic, center on it
    if (clinics.length === 1) {
      const clinic = clinics[0];
      mapRef.current.animateToRegion(
        {
          latitude: clinic.coordinates.latitude,
          longitude: clinic.coordinates.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
      return;
    }

    // For multiple clinics, fit all markers with padding
    const coordinates = clinics.map((clinic) => ({
      latitude: clinic.coordinates.latitude,
      longitude: clinic.coordinates.longitude,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
      animated: true,
    });
  }, [clinics]);

  // Update region when clinics change and we have at least one clinic
  useEffect(() => {
    if (clinics.length > 0 && mapRef.current) {
      // Calculate the region to fit all markers
      fitToMarkers();
    }
  }, [clinics, fitToMarkers]);

  const handleRecenter = () => {
    if (clinics.length > 0) {
      fitToMarkers();
    } else {
      mapRef.current?.animateToRegion(DEFAULT_ALBERTA_REGION, 1000);
    }
  };

  const handleMarkerPress = (clinicId: string) => {
    if (onMarkerPress) {
      onMarkerPress(clinicId);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
        loadingIndicatorColor="#2A7DE1"
        loadingBackgroundColor="#F8F9FA"
        onMapReady={() => setIsMapReady(true)}
        onRegionChangeComplete={setRegion}
        // Enable offline mode (maps will be cached)
        cacheEnabled={true}
        // Use standard map type for better offline support
        mapType="standard"
      >
        {/* Render clinic markers */}
        {clinics.map((clinic, index) => (
          <Marker
            key={clinic.id}
            coordinate={clinic.coordinates}
            title={clinic.name}
            description={clinic.address}
            onPress={() => handleMarkerPress(clinic.id)}
          >
            <View style={styles.markerContainer}>
              <View
                style={[
                  styles.markerBadge,
                  index === 0 ? styles.primaryMarker : styles.secondaryMarker,
                ]}
              >
                <Icon
                  name="local-hospital"
                  size={20}
                  color="#FFF"
                />
              </View>
              {index === 0 && (
                <Text style={styles.nearestLabel}>Nearest</Text>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map loading indicator */}
      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2A7DE1" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {/* Recenter button */}
      {isMapReady && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
        >
          <Icon name="my-location" size={24} color="#2A7DE1" />
        </TouchableOpacity>
      )}

      {/* Offline indicator */}
      <View style={styles.offlineIndicator}>
        <Icon name="cloud-off" size={16} color="#666" />
        <Text style={styles.offlineText}>Offline-capable</Text>
      </View>

      {/* Map legend */}
      {clinics.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.primaryMarker]} />
            <Text style={styles.legendText}>Nearest Clinic</Text>
          </View>
          {clinics.length > 1 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.secondaryMarker]} />
              <Text style={styles.legendText}>Other Clinics</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F8F9FA",
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
  map: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  markerContainer: {
    alignItems: "center",
  },
  markerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  primaryMarker: {
    backgroundColor: "#E12D2D",
  },
  secondaryMarker: {
    backgroundColor: "#2DE16B",
  },
  nearestLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#E12D2D",
    backgroundColor: "#FFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  recenterButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  offlineIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  offlineText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#666",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  legend: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#333",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
});
