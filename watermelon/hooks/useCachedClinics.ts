import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import MedicalFacility from '../models/MedicalFacility';

interface ClinicData {
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

/**
 * Cache clinic data in WatermelonDB for offline use
 */
export async function cacheClinics(
  clinics: ClinicData[],
  userLocation: string
): Promise<void> {
  try {
    const facilitiesCollection = database.collections.get<MedicalFacility>(
      'medical_facilities'
    );

    await database.write(async () => {
      // Delete old facilities for this location (refresh cache)
      const oldFacilities = await facilitiesCollection
        .query(Q.where('user_location', userLocation))
        .fetch();
      
      for (const old of oldFacilities) {
        await old.markAsDeleted();
      }

      // Insert new facilities
      for (const clinic of clinics) {
        await facilitiesCollection.create((facility) => {
          facility.facilityId = clinic.id;
          facility.name = clinic.name;
          facility.type = clinic.type;
          facility.address = clinic.address;
          facility.phone = clinic.phone || undefined;
          facility.hours = clinic.hours || undefined;
          facility.latitude = clinic.coordinates.latitude;
          facility.longitude = clinic.coordinates.longitude;
          facility.distance = clinic.distance;
          facility.distanceText = clinic.distanceText;
          facility.source = clinic.source;
          facility.userLocation = userLocation;
        });
      }
    });
    
    console.log(`✅ Cached ${clinics.length} clinics for location: ${userLocation}`);
  } catch (error) {
    console.error('❌ Failed to cache clinics:', error);
  }
}

/**
 * Retrieve cached clinic data from WatermelonDB
 */
export async function getCachedClinics(
  userLocation: string
): Promise<ClinicData[]> {
  try {
    const facilitiesCollection = database.collections.get<MedicalFacility>(
      'medical_facilities'
    );

    const facilities = await facilitiesCollection
      .query(
        Q.where('user_location', userLocation),
        Q.sortBy('distance', Q.asc)
      )
      .fetch();

    const clinics: ClinicData[] = facilities.map((facility) => ({
      id: facility.facilityId,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      phone: facility.phone || null,
      hours: facility.hours || null,
      coordinates: {
        latitude: facility.latitude,
        longitude: facility.longitude,
      },
      distance: facility.distance,
      distanceText: facility.distanceText,
      source: facility.source + ' (cached)',
    }));

    console.log(`📦 Retrieved ${clinics.length} cached clinics for: ${userLocation}`);
    return clinics;
  } catch (error) {
    console.error('❌ Failed to retrieve cached clinics:', error);
    return [];
  }
}

/**
 * Clear all cached clinic data (for cleanup/reset)
 */
export async function clearCachedClinics(): Promise<void> {
  try {
    const facilitiesCollection = database.collections.get<MedicalFacility>(
      'medical_facilities'
    );

    await database.write(async () => {
      const allFacilities = await facilitiesCollection.query().fetch();
      for (const facility of allFacilities) {
        await facility.markAsDeleted();
      }
    });
    
    console.log('🗑️ Cleared all cached clinics');
  } catch (error) {
    console.error('❌ Failed to clear cached clinics:', error);
  }
}
