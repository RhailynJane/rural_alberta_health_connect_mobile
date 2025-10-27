import Mapbox from '@rnmapbox/maps';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    DEFAULT_MAP_CONFIG,
    MAPBOX_ACCESS_TOKEN,
} from '../_config/mapbox.config';
import { COLORS, FONTS } from '../constants/constants';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface Clinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  phone?: string;
}

interface MapboxOfflineMapProps {
  clinics: Clinic[];
  userLocation: { latitude: number; longitude: number } | null;
  onClinicPress?: (clinic: Clinic) => void;
  // Optional external camera focus control
  focusCenter?: { latitude: number; longitude: number; zoom?: number } | null;
}

function MapboxOfflineMapComponent({
  clinics,
  userLocation,
  onClinicPress,
  focusCenter,
}: MapboxOfflineMapProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(true);
  const { isOnline } = useNetworkStatus();

  // Set map as ready after timeout if offline (tiles may be cached)
  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setIsMapReady(true);
      }, 3000); // Wait 3 seconds then assume offline tiles loaded
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Filter clinics to only those with valid numeric coordinates
  const sanitizedClinics = (clinics || []).filter((c) =>
    Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude)
  );
  // Find nearest clinic from sanitized list
  const nearestClinic = sanitizedClinics.length > 0 ? sanitizedClinics[0] : null;

  // Center on user location when available
  useEffect(() => {
    if (
      userLocation &&
      Number.isFinite(userLocation.latitude) &&
      Number.isFinite(userLocation.longitude) &&
      cameraRef.current &&
      followUserLocation
    ) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 12,
        animationDuration: 1000,
      });
    }
  }, [userLocation, followUserLocation]);

  // React to external focus requests (e.g., from OfflineMapDownloader)
  useEffect(() => {
    if (
      focusCenter &&
      Number.isFinite(focusCenter.latitude) &&
      Number.isFinite(focusCenter.longitude) &&
      cameraRef.current
    ) {
      setFollowUserLocation(false);
      cameraRef.current.setCamera({
        centerCoordinate: [focusCenter.longitude, focusCenter.latitude],
        zoomLevel: focusCenter.zoom ?? 10,
        animationDuration: 1200,
      });
    }
  }, [focusCenter]);

  const handleRecenter = () => {
    if (
      userLocation &&
      Number.isFinite(userLocation.latitude) &&
      Number.isFinite(userLocation.longitude) &&
      cameraRef.current
    ) {
      setFollowUserLocation(true);
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 12,
        animationDuration: 1000,
      });
    }
  };

  const handleClinicMarkerPress = (clinic: Clinic) => {
    setFollowUserLocation(false);
    if (onClinicPress) {
      onClinicPress(clinic);
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={DEFAULT_MAP_CONFIG.style}
        compassEnabled={true}
        compassViewPosition={3} // Top right
        scaleBarEnabled={false}
        attributionEnabled={DEFAULT_MAP_CONFIG.attributionEnabled}
        logoEnabled={DEFAULT_MAP_CONFIG.logoEnabled}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={DEFAULT_MAP_CONFIG.defaultZoom}
          centerCoordinate={
            userLocation &&
            Number.isFinite(userLocation.latitude) &&
            Number.isFinite(userLocation.longitude)
              ? [userLocation.longitude, userLocation.latitude]
              : [-114.0719, 51.0447] // Calgary default
          }
          animationMode="flyTo"
          animationDuration={2000}
        />

        {/* User Location */}
        {userLocation &&
          Number.isFinite(userLocation.latitude) &&
          Number.isFinite(userLocation.longitude) && (
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Clinic Markers */}
        {sanitizedClinics.map((clinic, index) => {
          const isNearest = index === 0 && nearestClinic?.id === clinic.id;
          return (
            <Mapbox.PointAnnotation
              key={clinic.id}
              id={clinic.id}
              coordinate={[clinic.longitude, clinic.latitude]}
              onSelected={() => handleClinicMarkerPress(clinic)}
            >
              <View
                style={[
                  styles.clinicMarker,
                  isNearest && styles.nearestClinicMarker,
                ]}
              >
                <Icon
                  name="medkit"
                  size={isNearest ? 24 : 20}
                  color="white"
                />
              </View>
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>

      {/* Loading Indicator */}
      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2A7DE1" />
          <Text style={styles.loadingText}>
            {isOnline ? 'Loading map...' : 'Loading offline map...'}
          </Text>
        </View>
      )}

      {/* Recenter Button */}
      {userLocation && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Icon
            name="locate"
            size={24}
            color={followUserLocation ? COLORS.primary : COLORS.darkGray}
          />
        </TouchableOpacity>
      )}

      {/* Map Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#EF4444' }]}>
            <Icon name="medkit" size={12} color="white" />
          </View>
          <Text style={styles.legendText}>Nearest Clinic</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendMarker, { backgroundColor: '#10B981' }]}>
            <Icon name="medkit" size={12} color="white" />
          </View>
          <Text style={styles.legendText}>Other Clinics</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.userLocationLegend}>
            <View style={styles.userLocationDot} />
          </View>
          <Text style={styles.legendText}>Your Location</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  clinicMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  nearestClinicMarker: {
    backgroundColor: '#EF4444',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  calloutContainer: {
    padding: 8,
    minWidth: 200,
  },
  calloutTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
    marginBottom: 4,
  },
  calloutText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  calloutDistance: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  userLocationLegend: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  legendText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 11,
    color: COLORS.darkGray,
  },
});

// Export memoized component to prevent unnecessary re-renders
export default React.memo(MapboxOfflineMapComponent);
