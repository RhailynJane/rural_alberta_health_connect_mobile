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
  } else if (
    normalizedLocation.includes("alberta") ||
    normalizedLocation.includes("ab")
  ) {
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
// HELPER FUNCTIONS
// ============================================

// Geocode using Nominatim (Free)
async function geocodeWithNominatim(
  location: string
): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ", Alberta, Canada")}&limit=1`;
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
    console.error("❌ Geocoding error:", error);
    return null;
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Filter medical facilities
function filterMedicalFacilities(
  facilities: ClinicFacility[]
): ClinicFacility[] {
  const medicalKeywords = [
    "hospital",
    "clinic",
    "medical",
    "health",
    "doctor",
    "physician",
    "surgery",
    "care",
    "wellness",
    "urgent",
    "emergency",
  ];

  const excludeKeywords = [
    "restaurant",
    "cafe",
    "shop",
    "store",
    "mall",
    "plaza",
    "museum",
    "gallery",
    "theatre",
    "cinema",
    "hotel",
    "spa",
    "salon",
    "pharmacy",
  ];

  return facilities.filter((facility) => {
    const name = facility.name.toLowerCase();
    const type = facility.type.toLowerCase();
    const address = facility.address.toLowerCase();

    // Check if it contains medical keywords
    const isMedical = medicalKeywords.some(
      (keyword) =>
        name.includes(keyword) ||
        type.includes(keyword) ||
        address.includes(keyword)
    );

    // Check if it contains exclude keywords
    const isExcluded = excludeKeywords.some(
      (keyword) => name.includes(keyword) || type.includes(keyword)
    );

    return isMedical && !isExcluded;
  });
}

// ============================================
// API FUNCTIONS FOR CLINIC DATA
// ============================================

// NEW Foursquare API implementation with updated endpoints and authentication
async function fetchFromNewFoursquareAPI(
  location: string,
  radius: number
): Promise<ClinicFacility[] | null> {
  const FOURSQUARE_SERVICE_KEY = process.env.FOURSQUARE_SERVICE_KEY;

  console.log("🔑 Foursquare Service Key exists:", !!FOURSQUARE_SERVICE_KEY);

  if (!FOURSQUARE_SERVICE_KEY) {
    console.log("❌ Foursquare Service Key not configured");
    return null;
  }

  try {
    // Geocode first to get coordinates
    console.log("📍 Geocoding location...");
    const coords = await geocodeWithNominatim(location);
    console.log("📍 Geocoded coordinates:", coords);
    if (!coords) {
      console.log("❌ Failed to geocode location");
      return null;
    }

    // PROPER MEDICAL CATEGORIES FOR FOURSQUARE
    const categories = "15014,15015,15016,15017";
    const searchUrl = `https://places-api.foursquare.com/places/search?ll=${coords.lat},${coords.lon}&radius=${radius}&categories=${categories}&limit=20&sort=DISTANCE`;

    console.log("🌐 Making NEW Foursquare API request to:", searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${FOURSQUARE_SERVICE_KEY}`,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-06-17", // Required header for new API
      },
    });

    console.log("📡 Foursquare API response status:", response.status);

    if (!response.ok) {
      console.log(
        "❌ Foursquare API error:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.log("❌ Foursquare API error details:", errorText);
      return null;
    }

    const data = await response.json();
    console.log(
      "📊 Foursquare API data received, results:",
      data.results?.length || 0
    );

    if (!data.results || data.results.length === 0) {
      console.log("❌ No clinics found in Foursquare response");
      return null;
    }

    console.log(`✅ Found ${data.results.length} clinics from Foursquare`);

    const facilities: ClinicFacility[] = data.results
      .map((place: any, index: number) => {
        // NEW FIELD NAMES: fsq_id -> fsq_place_id, geocodes -> latitude/longitude
        const placeId = place.fsq_place_id || place.fsq_id;
        const latitude = place.latitude || place.geocodes?.main?.latitude;
        const longitude = place.longitude || place.geocodes?.main?.longitude;

        if (!latitude || !longitude) {
          console.log(`❌ Skipping clinic ${place.name} - no coordinates`);
          return null;
        }

        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          latitude,
          longitude
        );

        // Build address from new location structure
        const locationInfo = place.location || {};
        const address =
          locationInfo.formatted_address ||
          [
            locationInfo.address,
            locationInfo.locality,
            locationInfo.region,
            locationInfo.postcode,
          ]
            .filter(Boolean)
            .join(", ") ||
          `${locationInfo.address || ""}, ${locationInfo.locality || ""}, ${locationInfo.region || ""}`.trim() ||
          locationInfo.cross_street ||
          "Address not available";

        console.log(`🏥 Clinic ${index + 1}:`, {
          name: place.name,
          address: address,
          distance: distance,
          phone: place.tel,
        });

        return {
          id: `foursquare-${placeId}`,
          name: place.name || "Medical Facility",
          type: place.categories?.[0]?.name || "medical",
          address: address,
          phone: place.tel || place.phone || place.contact?.phone || null,
          coordinates: {
            latitude: latitude,
            longitude: longitude,
          },
          distance: distance,
          distanceText:
            distance < 1
              ? `${(distance * 1000).toFixed(0)} meters`
              : `${distance.toFixed(1)} km`,
          source: "Foursquare",
        };
      })
      .filter(Boolean) as ClinicFacility[]; // Remove null entries

    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("❌ Foursquare API error:", error);
    return null;
  }
}

// OpenStreetMap implementation with medical filters
async function fetchFromOpenStreetMap(
  location: string,
  radius: number
): Promise<ClinicFacility[] | null> {
  try {
    console.log("📍 Geocoding location for OpenStreetMap...");
    const coords = await geocodeWithNominatim(location);
    if (!coords) {
      console.log("❌ Failed to geocode location for OpenStreetMap");
      return null;
    }

    // MORE SPECIFIC MEDICAL FACILITY QUERY
    const overpassQuery = `
      [out:json][timeout:25];
      (
        // Hospitals and major medical facilities
        node["amenity"="hospital"](around:${radius},${coords.lat},${coords.lon});
        node["amenity"="clinic"](around:${radius},${coords.lat},${coords.lon});
        node["amenity"="doctors"](around:${radius},${coords.lat},${coords.lon});
        node["healthcare"="hospital"](around:${radius},${coords.lat},${coords.lon});
        node["healthcare"="clinic"](around:${radius},${coords.lat},${coords.lon});
        node["healthcare"="doctor"](around:${radius},${coords.lat},${coords.lon});
        
        // Exclude non-medical facilities
        way["amenity"="hospital"](around:${radius},${coords.lat},${coords.lon});
        way["amenity"="clinic"](around:${radius},${coords.lat},${coords.lon});
        way["healthcare"="hospital"](around:${radius},${coords.lat},${coords.lon});
      );
      out body;
    `;

    console.log("🌐 Making OpenStreetMap API request...");
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
    });

    const data = await response.json();
    console.log(
      "📊 OpenStreetMap data received, elements:",
      data.elements?.length || 0
    );

    if (!data.elements || data.elements.length === 0) {
      console.log("❌ No clinics found in OpenStreetMap response");
      return null;
    }

    console.log(
      `✅ Found ${data.elements.length} medical facilities from OpenStreetMap`
    );

    // FILTER TO ONLY MEDICAL FACILITIES
    const facilities: ClinicFacility[] = data.elements
      .map((element: any, index: number) => {
        const tags = element.tags || {};
        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          element.lat,
          element.lon
        );

        // Skip if it's clearly not a medical facility
        const amenity = tags.amenity || "";
        const healthcare = tags.healthcare || "";

        // Skip restaurants, shops, etc.
        if (
          amenity &&
          [
            "restaurant",
            "cafe",
            "fast_food",
            "bar",
            "pub",
            "cinema",
            "theatre",
            "museum",
          ].includes(amenity)
        ) {
          return null;
        }

        const address =
          [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:city"] || tags["addr:town"] || tags["addr:suburb"],
            tags["addr:postcode"],
          ]
            .filter(Boolean)
            .join(" ") ||
          tags["operator"] ||
          tags["description"] ||
          "Address not available";

        // Determine facility type
        let facilityType = "medical";
        if (amenity === "hospital" || healthcare === "hospital")
          facilityType = "hospital";
        else if (amenity === "clinic" || healthcare === "clinic")
          facilityType = "clinic";
        else if (amenity === "doctors" || healthcare === "doctor")
          facilityType = "doctor";

        console.log(`🏥 Medical Facility ${index + 1}:`, {
          name: tags.name || "Unnamed Medical Facility",
          type: facilityType,
          address: address,
          distance: distance,
        });

        return {
          id: `osm-${element.id}`,
          name:
            tags.name || tags.operator || tags.healthcare || "Medical Facility",
          type: facilityType,
          address: address,
          phone: tags.phone || tags["contact:phone"] || null,
          coordinates: {
            latitude: element.lat,
            longitude: element.lon,
          },
          distance: distance,
          distanceText: `${distance.toFixed(1)} km`,
          source: "OpenStreetMap",
        };
      })
      .filter(Boolean) as ClinicFacility[]; // Remove null entries

    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("❌ OpenStreetMap error:", error);
    return null;
  }
}

// Enhanced fallback with more clinic options
function getEnhancedAlbertaClinicsWithMoreOptions(
  location: string
): ClinicDataResponse {
  const normalizedLocation = location.toLowerCase();

  console.log("🔄 Using enhanced fallback for location:", location);

  // More comprehensive clinic data for major Alberta cities
  const cityClinics = {
    calgary: [
      {
        id: "fallback-calgary-1",
        name: "Foothills Medical Centre",
        type: "hospital",
        address: "1403 29 St NW, Calgary, AB T2N 2T9",
        phone: "(403) 944-1110",
        coordinates: { latitude: 51.0676, longitude: -114.1308 },
        distance: 0,
        distanceText: "15-20 minutes away",
        source: "Alberta Health Services",
      },
      {
        id: "fallback-calgary-2",
        name: "Peter Lougheed Centre",
        type: "hospital",
        address: "3500 26 Ave NE, Calgary, AB T1Y 6J4",
        phone: "(403) 943-4555",
        coordinates: { latitude: 51.0772, longitude: -113.9995 },
        distance: 0,
        distanceText: "15-20 minutes away",
        source: "Alberta Health Services",
      },
      {
        id: "fallback-calgary-3",
        name: "Rockyview General Hospital",
        type: "hospital",
        address: "7007 14 St SW, Calgary, AB T2V 1P9",
        phone: "(403) 943-3000",
        coordinates: { latitude: 51.0086, longitude: -114.0889 },
        distance: 0,
        distanceText: "15-20 minutes away",
        source: "Alberta Health Services",
      },
    ],
    edmonton: [
      {
        id: "fallback-edmonton-1",
        name: "Royal Alexandra Hospital",
        type: "hospital",
        address: "10240 Kingsway NW, Edmonton, AB T5H 3V9",
        phone: "(780) 735-4111",
        coordinates: { latitude: 53.567, longitude: -113.5043 },
        distance: 0,
        distanceText: "10-15 minutes away",
        source: "Alberta Health Services",
      },
      {
        id: "fallback-edmonton-2",
        name: "University of Alberta Hospital",
        type: "hospital",
        address: "8440 112 St NW, Edmonton, AB T6G 2B7",
        phone: "(780) 407-8822",
        coordinates: { latitude: 53.5206, longitude: -113.5251 },
        distance: 0,
        distanceText: "10-15 minutes away",
        source: "Alberta Health Services",
      },
      {
        id: "fallback-edmonton-3",
        name: "Misericordia Community Hospital",
        type: "hospital",
        address: "16940 87 Ave NW, Edmonton, AB T5R 4H5",
        phone: "(780) 930-5100",
        coordinates: { latitude: 53.5189, longitude: -113.5769 },
        distance: 0,
        distanceText: "10-15 minutes away",
        source: "Alberta Health Services",
      },
    ],
    lethbridge: [
      {
        id: "fallback-lethbridge-1",
        name: "Chinook Regional Hospital",
        type: "hospital",
        address: "960 19 St S, Lethbridge, AB T1J 1W5",
        phone: "(403) 382-6111",
        coordinates: { latitude: 49.6865, longitude: -112.8328 },
        distance: 0,
        distanceText: "5-10 minutes away",
        source: "Alberta Health Services",
      },
    ],
    reddeer: [
      {
        id: "fallback-reddeer-1",
        name: "Red Deer Regional Hospital",
        type: "hospital",
        address: "3942 50A Ave, Red Deer, AB T4N 4E7",
        phone: "(403) 343-4422",
        coordinates: { latitude: 52.2681, longitude: -113.8112 },
        distance: 0,
        distanceText: "5-10 minutes away",
        source: "Alberta Health Services",
      },
    ],
  };

  if (normalizedLocation.includes("calgary") && cityClinics.calgary) {
    console.log("✅ Using Calgary fallback clinics");
    return {
      source: "Alberta Health Services",
      facilities: cityClinics.calgary,
    };
  } else if (normalizedLocation.includes("edmonton") && cityClinics.edmonton) {
    console.log("✅ Using Edmonton fallback clinics");
    return {
      source: "Alberta Health Services",
      facilities: cityClinics.edmonton,
    };
  } else if (
    normalizedLocation.includes("lethbridge") &&
    cityClinics.lethbridge
  ) {
    console.log("✅ Using Lethbridge fallback clinics");
    return {
      source: "Alberta Health Services",
      facilities: cityClinics.lethbridge,
    };
  } else if (normalizedLocation.includes("red deer") && cityClinics.reddeer) {
    console.log("✅ Using Red Deer fallback clinics");
    return {
      source: "Alberta Health Services",
      facilities: cityClinics.reddeer,
    };
  } else {
    console.log("🔄 Using default fallback for location:", location);
    // Return the original enhanced fallback for other locations
    const fallbackData = getEnhancedAlbertaClinics(location);
    return {
      source: "Alberta Health Services",
      facilities: [
        {
          id: "fallback-default-1",
          name: fallbackData.localClinic.name,
          type: "clinic",
          address: fallbackData.localClinic.address,
          phone: fallbackData.localClinic.number,
          coordinates: fallbackData.localClinic.coordinates,
          distance: 0,
          distanceText: fallbackData.localClinic.distance,
          source: "Alberta Health Services",
        },
      ],
    };
  }
}

// Original enhanced fallback function (keep this for backward compatibility)
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
          longitude: -114.0719,
        },
      },
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
          longitude: -113.4938,
        },
      },
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
          longitude: -112.8328,
        },
      },
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
          longitude: -113.8112,
        },
      },
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
          longitude: -113.506,
        },
      },
    },
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
// MAIN ACTIONS
// ============================================

// Main action: Fetch nearby clinics with multiple fallbacks
export const fetchNearbyClinics = action({
  args: { location: v.string(), radius: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ClinicDataResponse> => {
    const radius = args.radius || 10000;

    console.log(`🔍 Searching for MEDICAL clinics near: ${args.location}`);

    try {
      // Try Foursquare first with medical categories
      console.log("🔄 Trying NEW Foursquare API with medical categories...");
      const foursquareData = await fetchFromNewFoursquareAPI(
        args.location,
        radius
      );
      if (foursquareData && foursquareData.length > 0) {
        const filteredData = filterMedicalFacilities(foursquareData);
        console.log(
          `✅ Found ${filteredData.length} medical clinics via Foursquare (filtered from ${foursquareData.length})`
        );
        if (filteredData.length > 0) {
          return { source: "Foursquare", facilities: filteredData };
        }
      }
      console.log("❌ Foursquare returned no medical facilities");
    } catch (error) {
      console.log("❌ Foursquare API failed:", error);
    }

    try {
      // Try OpenStreetMap as second option
      console.log("🔄 Trying OpenStreetMap API with medical filters...");
      const osmData = await fetchFromOpenStreetMap(args.location, radius);
      if (osmData && osmData.length > 0) {
        const filteredData = filterMedicalFacilities(osmData);
        console.log(
          `✅ Found ${filteredData.length} medical clinics via OpenStreetMap (filtered from ${osmData.length})`
        );
        if (filteredData.length > 0) {
          return { source: "OpenStreetMap", facilities: filteredData };
        }
      }
      console.log("❌ OpenStreetMap returned no medical facilities");
    } catch (error) {
      console.log("❌ OpenStreetMap API failed:", error);
    }

    console.log("🔄 Using enhanced fallback Alberta clinic data");
    // Enhanced fallback with better data
    return getEnhancedAlbertaClinicsWithMoreOptions(args.location);
  },
});

// ACTION TO GET REAL-TIME CLINIC DATA
export const getRealTimeClinicData = action({
  args: {},
  handler: async (ctx): Promise<ClinicDataResponse | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    // Get user profile to check location services and location
    const profile = await ctx.runQuery(
      api.profile.personalInformation.getOnboardingStatus,
      {}
    );

    if (
      !profile ||
      !profile.profile ||
      !profile.profile.locationServicesEnabled ||
      !profile.profile.location
    ) {
      console.log("❌ User profile not found or location services disabled");
      return null;
    }

    console.log("📍 User location:", profile.profile.location);

    // Fetch real-time clinic data
    return await ctx.runAction(api.locationServices.fetchNearbyClinics, {
      location: profile.profile.location,
    });
  },
});
