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
import Mapbox from '../_utils/mapboxFix';
import { COLORS, FONTS } from '../constants/constants';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Initialize Mapbox - wrapped in try-catch to prevent crashes
try {
  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_PUBLIC_TOKEN') {
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    console.log('✅ Mapbox access token configured');
  } else {
    console.error('❌ Mapbox access token not configured properly');
  }
} catch (error) {
  console.error('❌ Failed to initialize Mapbox:', error);
}

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
  // Top offset for floating buttons (to account for status bar)
  topOffset?: number;
}

function MapboxOfflineMapComponent({
  clinics,
  userLocation,
  onClinicPress,
  focusCenter,
  topOffset = 16,
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
      {(!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_PUBLIC_TOKEN') ? (
        <View style={styles.errorContainer}>
          <Icon name="warning" size={48} color="#DC3545" />
          <Text style={styles.errorText}>
            Map not available: Mapbox token not configured
          </Text>
        </View>
      ) : (
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={DEFAULT_MAP_CONFIG.style}
          compassEnabled={true}
          compassViewPosition={3} // Top right
          scaleBarEnabled={false}
          attributionEnabled={DEFAULT_MAP_CONFIG.attributionEnabled}
          logoEnabled={DEFAULT_MAP_CONFIG.logoEnabled}
          onDidFinishLoadingMap={() => {
            console.log('✅ Map loaded successfully');
            setIsMapReady(true);
          }}
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

        {/* User Location Marker */}
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
        {sanitizedClinics.map((clinic) => (
          <Mapbox.PointAnnotation
            key={clinic.id}
            id={clinic.id}
            coordinate={[clinic.longitude, clinic.latitude]}
            onSelected={() => handleClinicMarkerPress(clinic)}
          >
            <View style={styles.clinicMarker}>
              <Icon name="medkit" size={18} color="white" />
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>
      )}

      {/* Loading Indicator */}
      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2A7DE1" />
          <Text style={styles.loadingText}>
            {isOnline ? 'Loading map...' : 'Loading offline map...'}
          </Text>
        </View>
      )}

      {/* Recenter Button - Glass Style */}
      {userLocation && (
        <TouchableOpacity
          style={[styles.recenterButton, { top: topOffset }]}
          onPress={handleRecenter}
          activeOpacity={0.7}
        >
          <Icon
            name="locate"
            size={22}
            color={followUserLocation ? COLORS.primary : '#64748B'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
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
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#3B82F6',
  },
  userLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  clinicMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});

// Export memoized component to prevent unnecessary re-renders
export default React.memo(MapboxOfflineMapComponent);
