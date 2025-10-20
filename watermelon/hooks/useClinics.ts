import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';
import { useCallback, useEffect, useState } from 'react';
import MedicalFacility from '../models/MedicalFacility';

interface ClinicData {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  distanceText: string;
  source: string;
}

interface UseClinicsOptions {
  userLocation: string | null;
  maxDistance?: number; // in km
}

/**
 * Hook to manage clinic data caching in WatermelonDB
 * Provides cached clinics for offline access
 */
export function useClinics({ userLocation, maxDistance = 50 }: UseClinicsOptions) {
  const database = useDatabase();
  const [cachedClinics, setCachedClinics] = useState<ClinicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const loadCachedClinics = useCallback(async () => {
    try {
      setIsLoading(true);
      const facilitiesCollection = database.get<MedicalFacility>('medical_facilities');
      
      // Query facilities near user location, sorted by distance
      const facilities = await facilitiesCollection
        .query(
          Q.where('user_location', userLocation),
          Q.where('distance', Q.lte(maxDistance)),
          Q.sortBy('distance', Q.asc),
          Q.take(20) // Limit to 20 closest facilities
        )
        .fetch();

      const clinicData: ClinicData[] = facilities.map(facility => ({
        id: facility.facilityId,
        name: facility.name,
        type: facility.type,
        address: facility.address,
        phone: facility.phone || null,
        coordinates: {
          latitude: facility.latitude,
          longitude: facility.longitude,
        },
        distance: facility.distance,
        distanceText: facility.distanceText,
        source: facility.source,
      }));

      setCachedClinics(clinicData);
      
      // Check when data was last synced
      if (facilities.length > 0) {
        const latestFacility = facilities[0];
        setLastSyncTime(new Date(latestFacility.createdAt));
      }
    } catch (error) {
      console.error('Error loading cached clinics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [database, userLocation, maxDistance]);

  // Load cached clinics from WatermelonDB
  useEffect(() => {
    if (!database || !userLocation) {
      setIsLoading(false);
      return;
    }

    loadCachedClinics();
  }, [database, userLocation, loadCachedClinics]);

  /**
   * Save/update clinic data to WatermelonDB cache
   */
  const saveClinics = async (clinics: ClinicData[], userLoc: string) => {
    if (!database) return;

    try {
      await database.write(async () => {
        const facilitiesCollection = database.get<MedicalFacility>('medical_facilities');

        // Delete old cached data for this location (to avoid duplicates)
        const oldFacilities = await facilitiesCollection
          .query(Q.where('user_location', userLoc))
          .fetch();
        
        for (const facility of oldFacilities) {
          await facility.markAsDeleted();
        }

        // Save new clinic data
        for (const clinic of clinics) {
          await facilitiesCollection.create((facility: any) => {
            facility.facilityId = clinic.id;
            facility.name = clinic.name;
            facility.type = clinic.type;
            facility.address = clinic.address;
            facility.phone = clinic.phone || undefined;
            facility.latitude = clinic.coordinates.latitude;
            facility.longitude = clinic.coordinates.longitude;
            facility.distance = clinic.distance;
            facility.distanceText = clinic.distanceText;
            facility.source = clinic.source;
            facility.userLocation = userLoc;
          });
        }
      });

      console.log(`✅ Saved ${clinics.length} clinics to cache for location: ${userLoc}`);
      setLastSyncTime(new Date());
      
      // Reload cached clinics
      await loadCachedClinics();
    } catch (error) {
      console.error('Error saving clinics to cache:', error);
    }
  };

  /**
   * Clear all cached clinic data
   */
  const clearCache = async () => {
    if (!database) return;

    try {
      await database.write(async () => {
        const facilitiesCollection = database.get<MedicalFacility>('medical_facilities');
        const allFacilities = await facilitiesCollection.query().fetch();
        
        for (const facility of allFacilities) {
          await facility.markAsDeleted();
        }
      });

      setCachedClinics([]);
      setLastSyncTime(null);
      console.log('✅ Cleared all cached clinic data');
    } catch (error) {
      console.error('Error clearing clinic cache:', error);
    }
  };

  /**
   * Check if cache data is stale (older than 7 days)
   */
  const isCacheStale = (): boolean => {
    if (!lastSyncTime) return true;
    
    const daysSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSync > 7;
  };

  return {
    cachedClinics,
    isLoading,
    lastSyncTime,
    isCacheStale: isCacheStale(),
    saveClinics,
    clearCache,
    refreshCache: loadCachedClinics,
  };
}

export default useClinics;
