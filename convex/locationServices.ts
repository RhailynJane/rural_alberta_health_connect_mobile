import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

// ============================================
// TYPES
// ============================================

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ClinicFacility {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string | null;
  coordinates: Coordinates;
  distance: number;
  distanceText: string;
  source: string;
}

interface ClinicDataResponse {
  source: string;
  facilities: ClinicFacility[];
}

interface GeocodeResult {
  lat: number;
  lon: number;
  displayName?: string;
}

// ============================================
// EXISTING QUERIES AND MUTATIONS
// ============================================

// Query to get location services settings
export const getLocationServicesStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    // Return default values if profile doesn't exist
    if (!profile) {
      return {
        locationServicesEnabled: false,
        location: null,
      };
    }

    return {
      locationServicesEnabled: profile.locationServicesEnabled ?? false,
      location: profile.location ?? null,
    };
  },
});

// Mutation to toggle location services
export const toggleLocationServices = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    // Create profile if it doesn't exist
    if (!profile) {
      await ctx.db.insert("userProfiles", {
        userId,
        locationServicesEnabled: args.enabled,
        onboardingCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true };
    }

    // Update existing profile
    await ctx.db.patch(profile._id, {
      locationServicesEnabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to update user location
export const updateUserLocation = mutation({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    // Create profile if it doesn't exist
    if (!profile) {
      await ctx.db.insert("userProfiles", {
        userId,
        location: args.location,
        onboardingCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true };
    }

    // Update existing profile
    await ctx.db.patch(profile._id, {
      location: args.location,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Query to get emergency location details
export const getEmergencyLocationDetails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    // Return null if no profile or location services disabled
    if (!profile || !profile.locationServicesEnabled) {
      return null;
    }

    // Get location-based clinic information
    const locationData = getLocationBasedData(profile.location);

    return locationData;
  },
});

// Helper function to map locations to clinic data
function getLocationBasedData(location: string | undefined) {
  if (!location) {
    return {
      approximateLocation: "Unknown",
      nearestHospital: "Unknown",
      emergencyResponseTime: "Unknown",
      localClinic: {
        name: "Unknown",
        number: "Unknown",
        distance: "Unknown",
      },
    };
  }

  // Normalize location string
  const normalizedLocation = location.toLowerCase();

  // Alberta locations mapping
  if (normalizedLocation.includes("calgary")) {
    return {
      approximateLocation: "Calgary, AB",
      nearestHospital: "15 minutes away",
      emergencyResponseTime: "8-12 minutes",
      localClinic: {
        name: "Calgary Medical Clinic",
        number: "(403) 555-0123",
        distance: "Approx. 10 minutes away",
      },
    };
  } else if (normalizedLocation.includes("edmonton")) {
    return {
      approximateLocation: "Edmonton, AB",
      nearestHospital: "12 minutes away",
      emergencyResponseTime: "7-10 minutes",
      localClinic: {
        name: "Edmonton Health Centre",
        number: "(780) 555-0456",
        distance: "Approx. 8 minutes away",
      },
    };
  } else if (normalizedLocation.includes("alberta") || normalizedLocation.includes("ab")) {
    // Rural Alberta
    return {
      approximateLocation: "Rural Alberta",
      nearestHospital: "45 minutes away",
      emergencyResponseTime: "15-20 minutes",
      localClinic: {
        name: "Rural Health Centre",
        number: "(780) 555-0123",
        distance: "Approx. 45 minutes away",
      },
    };
  }

  // Default fallback for other locations
  return {
    approximateLocation: location,
    nearestHospital: "20 minutes away",
    emergencyResponseTime: "10-15 minutes",
    localClinic: {
      name: "Local Medical Clinic",
      number: "(403) 555-0100",
      distance: "Approx. 20 minutes away",
    },
  };
}

// ============================================
// REAL-TIME CLINIC DATA WITH FOURSQUARE
// ============================================

// Main action: Fetch nearby clinics using Foursquare
export const fetchNearbyClinics = action({
  args: { location: v.string(), radius: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ClinicDataResponse> => {
    const radius = args.radius || 10000; // Default 10km radius

    try {
      // Use Foursquare Places API
      const foursquareData = await fetchFromFoursquare(args.location, radius);
      if (foursquareData && foursquareData.length > 0) {
        return { source: "Foursquare", facilities: foursquareData };
      }
    } catch (error) {
      console.log("Foursquare API failed:", error);
    }

    // Fallback to enhanced Alberta clinics data
    const fallbackData = getEnhancedAlbertaClinics(args.location);
    return { 
      source: "Alberta Health Database", 
      facilities: [{
        id: "fallback-1",
        name: fallbackData.localClinic.name,
        type: "clinic",
        address: fallbackData.localClinic.address,
        phone: fallbackData.localClinic.number,
        coordinates: fallbackData.localClinic.coordinates,
        distance: 0,
        distanceText: fallbackData.localClinic.distance,
        source: "Alberta Health"
      }]
    };
  },
});

// Foursquare Places API implementation
async function fetchFromFoursquare(location: string, radius: number): Promise<ClinicFacility[] | null> {
  const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
  
  if (!FOURSQUARE_API_KEY) {
    console.log("Foursquare API key not configured - using fallback data");
    return null;
  }

  try {
    // Geocode first to get coordinates
    const coords = await geocodeWithNominatim(location);
    if (!coords) return null;

    // Search for medical facilities using Foursquare categories
    // Categories: 16000 (Hospital), 16001 (Doctor's Office), 16002 (Dentist), 16003 (Emergency Room)
    const categories = "16000,16001,16003"; // Hospital, Doctor, Emergency Room
    const searchUrl = `https://api.foursquare.com/v3/places/search?ll=${coords.lat},${coords.lon}&radius=${radius}&categories=${categories}&limit=20&sort=DISTANCE`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: FOURSQUARE_API_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const facilities: ClinicFacility[] = data.results.map((place: any) => {
      const distance = calculateDistance(
        coords.lat,
        coords.lon,
        place.geocodes.main.latitude,
        place.geocodes.main.longitude
      );

      return {
        id: `foursquare-${place.fsq_id}`,
        name: place.name,
        type: place.categories?.[0]?.name || "medical",
        address: place.location.formatted_address || `${place.location.address || ''}, ${place.location.locality || ''}, ${place.location.region || ''}`.trim(),
        phone: place.tel || null,
        coordinates: {
          latitude: place.geocodes.main.latitude,
          longitude: place.geocodes.main.longitude,
        },
        distance: distance,
        distanceText: distance < 1 ? `${(distance * 1000).toFixed(0)} meters` : `${distance.toFixed(1)} km`,
        source: "Foursquare",
      };
    });

    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("Foursquare API error:", error);
    return null;
  }
}

// Enhanced Alberta clinics database for fallback
function getEnhancedAlbertaClinics(location: string) {
  const normalizedLocation = location.toLowerCase();

  const albertaClinics = {
    calgary: {
      approximateLocation: "Calgary, Alberta",
      nearestHospital: "Foothills Medical Centre - 15 mins",
      emergencyResponseTime: "8-12 minutes",
      localClinic: {
        name: "Calgary Primary Care Network",
        number: "(403) 943-9300",
        address: "1212 1st St SE, Calgary, AB T2G 5H4",
        distance: "Approx. 10 minutes away",
        coordinates: {
          latitude: 51.0447,
          longitude: -114.0719
        }
      }
    },
    edmonton: {
      approximateLocation: "Edmonton, Alberta",
      nearestHospital: "Royal Alexandra Hospital - 12 mins",
      emergencyResponseTime: "7-10 minutes",
      localClinic: {
        name: "Edmonton Southside Primary Care Network",
        number: "(780) 395-2626",
        address: "4540 50 St NW, Edmonton, AB T6L 6B5",
        distance: "Approx. 8 minutes away",
        coordinates: {
          latitude: 53.5461,
          longitude: -113.4938
        }
      }
    },
    lethbridge: {
      approximateLocation: "Lethbridge, Alberta",
      nearestHospital: "Chinook Regional Hospital - 10 mins",
      emergencyResponseTime: "6-9 minutes",
      localClinic: {
        name: "Lethbridge Primary Care Network",
        number: "(403) 329-0611",
        address: "1605 9 Ave S, Lethbridge, AB T1J 1W9",
        distance: "Approx. 5 minutes away",
        coordinates: {
          latitude: 49.6942,
          longitude: -112.8328
        }
      }
    },
    reddeer: {
      approximateLocation: "Red Deer, Alberta",
      nearestHospital: "Red Deer Regional Hospital - 8 mins",
      emergencyResponseTime: "5-8 minutes",
      localClinic: {
        name: "Red Deer Primary Care Network",
        number: "(403) 343-9100",
        address: "5120 48 St, Red Deer, AB T4N 1S6",
        distance: "Approx. 6 minutes away",
        coordinates: {
          latitude: 52.2681,
          longitude: -113.8112
        }
      }
    },
    default: {
      approximateLocation: location,
      nearestHospital: "Nearest Alberta Hospital - 20 mins",
      emergencyResponseTime: "10-15 minutes",
      localClinic: {
        name: "Alberta Health Services Info",
        number: "(780) 427-1432",
        address: "10025 Jasper Ave, Edmonton, AB T5J 1S6",
        distance: "Contact for nearest location",
        coordinates: {
          latitude: 53.5354,
          longitude: -113.5060
        }
      }
    }
  };

  if (normalizedLocation.includes("calgary")) {
    return albertaClinics.calgary;
  } else if (normalizedLocation.includes("edmonton")) {
    return albertaClinics.edmonton;
  } else if (normalizedLocation.includes("lethbridge")) {
    return albertaClinics.lethbridge;
  } else if (normalizedLocation.includes("red deer")) {
    return albertaClinics.reddeer;
  } else {
    return albertaClinics.default;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Geocode using Nominatim (Free)
async function geocodeWithNominatim(location: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', Alberta, Canada')}&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MedicalFacilityFinder/1.0",
      },
    });
    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================
// ACTION TO GET REAL-TIME CLINIC DATA
// ============================================

export const getRealTimeClinicData = action({
  args: {},
  handler: async (ctx): Promise<ClinicDataResponse | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    // Get user profile to check location services and location
    const profile = await ctx.runQuery(api.profile.personalInformation.getOnboardingStatus, {});

    if (!profile || !profile.profile || !profile.profile.locationServicesEnabled || !profile.profile.location) {
      return null;
    }

    // Fetch real-time clinic data
    return await ctx.runAction(api.locationServices.fetchNearbyClinics, { 
      location: profile.profile.location 
    });
  },
});

// ============================================
// BATCH FETCH: Get all clinics in Alberta (Optional)
// ============================================

export const fetchAllAlbertaClinics = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    const albertaCities = [
      "Calgary", "Edmonton", "Red Deer", "Lethbridge", "Medicine Hat",
      "Fort McMurray", "Grande Prairie", "Airdrie", "Spruce Grove"
    ];

    const allFacilities: any[] = [];

    for (const city of albertaCities) {
      try {
        const result = await ctx.runAction(api.locationServices.fetchNearbyClinics, { 
          location: city,
          radius: 25000 // 25km radius for each city
        });
        
        if (result && result.facilities) {
          allFacilities.push({
            city: city,
            facilities: result.facilities,
            source: result.source
          });
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to fetch clinics for ${city}:`, error);
      }
    }

    return allFacilities;
  },
});