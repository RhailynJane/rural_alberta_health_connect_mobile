import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
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
  hours?: string | null;
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
// QUERIES
// ============================================

export const getLocationServicesStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        locationServicesEnabled: false,
        location: null,
      };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

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

export const getEmergencyLocationDetails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null; // Return null instead of undefined
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    if (!profile || !profile.locationServicesEnabled) {
      return null;
    }

    const locationData = getLocationBasedData(profile.location);
    return locationData;
  },
});

// ============================================
// MUTATIONS
// ============================================

export const toggleLocationServices = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

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

    await ctx.db.patch(profile._id, {
      locationServicesEnabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateUserLocation = mutation({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      await ctx.db.insert("userProfiles", {
        userId,
        location: args.location,
        onboardingCompleted: false,
        locationServicesEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true };
    }

    await ctx.db.patch(profile._id, {
      location: args.location,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// ACTIONS
// ============================================

export const getRealTimeClinicData = action({
  args: { 
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<ClinicDataResponse | null> => {
    console.log("User location:", args.location);
    
    // If coordinates provided, use them directly; otherwise geocode the location string
    let lat: number;
    let lon: number;
    
    if (args.latitude !== undefined && args.longitude !== undefined) {
      console.log(`Using provided coordinates: ${args.latitude}, ${args.longitude}`);
      lat = args.latitude;
      lon = args.longitude;
    } else {
      console.log(`🗺️ Geocoding location string: ${args.location}`);
      const geocoded = await geocodeWithMapbox(args.location);
      if (!geocoded) {
        console.log("❌ Could not determine coordinates");
        return null;
      }
      lat = geocoded.lat;
      lon = geocoded.lon;
      console.log(`Geocoded to: ${lat}, ${lon}`);
    }

    try {
      console.log("🔍 Attempting to fetch from Mapbox Places...");
      const mapboxFacilities = await fetchFromMapboxPlaces(lat, lon, 10000);
      console.log(`📊 Mapbox returned ${mapboxFacilities?.length || 0} facilities`);
      
      if (mapboxFacilities && mapboxFacilities.length > 0) {
        console.log("🔎 Filtering medical facilities...");
        const filteredData = filterMedicalFacilities(mapboxFacilities);
        console.log(`✅ Filtered to ${filteredData.length} medical facilities`);
        
        if (filteredData.length > 0) {
          console.log(`✨ Returning ${filteredData.slice(0, 10).length} clinics from Mapbox`);
          return {
            source: "Mapbox",
            facilities: filteredData.slice(0, 10),
          };
        } else {
          console.log("⚠️ All facilities were filtered out (none matched medical criteria)");
        }
      } else {
        console.log("⚠️ Mapbox returned no facilities or null");
      }
    } catch (error) {
      console.log("❌ Mapbox Places failed with error:", error);
    }

    console.log("⚠️ Using fallback Alberta clinic data");
    return getEnhancedAlbertaClinicsWithMoreOptions(args.location);
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

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

  const normalizedLocation = location.toLowerCase();

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

async function geocodeWithMapbox(location: string): Promise<GeocodeResult | null> {
  try {
    // Support raw "lat,lng" input first
    const parts = location.split(",").map((p) => p.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon, displayName: location };
      }
    }

    const MAPBOX_TOKEN =
      (process.env.MAPBOX_ACCESS_TOKEN as string | undefined) ||
      (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN as string | undefined);
    if (!MAPBOX_TOKEN) {
      console.warn("Mapbox token not set in environment");
      return null;
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      location + ", Alberta, Canada"
    )}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature || !Array.isArray(feature.center)) return null;
    const [lon, lat] = feature.center;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, displayName: feature.place_name };
  } catch (error) {
    console.error("Mapbox geocoding error:", error);
    return null;
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

async function fetchFromOverpass(lat: number, lon: number, radiusMeters: number): Promise<ClinicFacility[] | null> {
  try {
    // Overpass API query for hospitals, clinics, and doctors
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
        node["amenity"="clinic"](around:${radiusMeters},${lat},${lon});
        node["amenity"="doctors"](around:${radiusMeters},${lat},${lon});
        node["healthcare"](around:${radiusMeters},${lat},${lon});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
        way["amenity"="clinic"](around:${radiusMeters},${lat},${lon});
        way["amenity"="doctors"](around:${radiusMeters},${lat},${lon});
        way["healthcare"](around:${radiusMeters},${lat},${lon});
      );
      out center;
    `;

    const url = "https://overpass-api.de/api/interpreter";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.log(`❌ Overpass API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const elements = data?.elements || [];
    console.log(`Overpass returned ${elements.length} raw elements`);

    if (elements.length === 0) return null;

    const facilities: ClinicFacility[] = [];
    for (const element of elements) {
      const elementLat = element.lat || element.center?.lat;
      const elementLon = element.lon || element.center?.lon;
      
      if (!Number.isFinite(elementLat) || !Number.isFinite(elementLon)) continue;

      const name = element.tags?.name || element.tags?.["name:en"] || "Medical Facility";
      const amenity = element.tags?.amenity || element.tags?.healthcare || "clinic";
      const address = [
        element.tags?.["addr:housenumber"],
        element.tags?.["addr:street"],
        element.tags?.["addr:city"] || "Calgary",
        element.tags?.["addr:province"] || "AB"
      ].filter(Boolean).join(" ");

  const phone = element.tags?.phone || element.tags?.["contact:phone"] || null;
  const hours = element.tags?.opening_hours || null;
      const distance = calculateDistance(lat, lon, elementLat, elementLon);

      facilities.push({
        id: `osm-${element.type}-${element.id}`,
        name,
        type: amenity,
        address: address || "Address not available",
        phone,
        hours,
        coordinates: { latitude: elementLat, longitude: elementLon },
        distance,
        distanceText: distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`,
        source: "OpenStreetMap",
      });
    }

    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("❌ Overpass API error:", error);
    return null;
  }
}

function filterMedicalFacilities(
  facilities: ClinicFacility[]
): ClinicFacility[] {
  // Strict medical keywords that MUST be present
  const strictMedicalKeywords = [
    "hospital",
    "clinic",
    "medical center",
    "medical centre",
    "health center",
    "health centre",
    "urgent care",
    "emergency",
    "surgery center",
    "surgery centre",
    "family medicine",
    "walk-in clinic",
    "healthcare",
  ];

  // Additional medical indicators (less strict)
  const additionalMedicalKeywords = [
    "medical",
    "health",
    "surgery",
    "care center",
    "care centre",
    "physician",
    "doctor",
  ];

  // Comprehensive exclusion list
  const excludeKeywords = [
    // Mental Health / Psychiatric (EXCLUDE - not emergency medical)
    "mental health",
    "mental",
    "psychiatric",
    "psychiatry",
    "psychiatrist",
    "psychology",
    "psychologist",
    "psychotherapy",
    "counseling",
    "counselling",
    "therapy",
    "adhd",
    "add",
    "autism",
    "behavioral",
    "behavioural",
    "cognitive",
    // Commercial
    "restaurant",
    "cafe",
    "coffee",
    "shop",
    "store",
    "mall",
    "plaza",
    "market",
    "grocery",
    "supermarket",
    "shopping",
    // Entertainment
    "museum",
    "gallery",
    "theatre",
    "theater",
    "cinema",
    "movie",
    "hotel",
    "motel",
    "resort",
    // Beauty/Wellness (non-medical)
    "spa",
    "salon",
    "barber",
    "massage",
    "nail",
    "beauty",
    "cosmetic",
    // Pharmacies (separate from clinics)
    "pharmacy",
    "drugstore",
    "drug store",
    "shoppers",
    "rexall",
    "london drugs",
    // Labs (separate from clinics)
    "laboratory",
    "lab corp",
    "dynacare",
    "lifelabs",
    "diagnostic",
    // Veterinary
    "vet",
    "veterinary",
    "animal",
    "pet",
    // Specialized services (non-emergency)
    "passport",
    "lasik",
    "optical",
    "optometrist",
    "optician",
    "eyewear",
    "vision center",
    "hearing",
    "audiology",
    "dental",
    "dentist",
    "orthodont",
    "chiropract",
    "physiotherapy",
    "physio",
    "acupuncture",
    "massage therapy",
    "counseling",
    "counselling",
    "psycholog",
    "psychiatr",
    // Educational/Administrative
    "university",
    "college",
    "school",
    "education",
    "office building",
    "administration",
    "corporate",
    // Other
    "parking",
    "atm",
    "bank",
    "insurance",
  ];

  return facilities.filter((facility) => {
    const name = facility.name.toLowerCase();
    const type = facility.type.toLowerCase();
    const combinedText = `${name} ${type}`;

    // First, check exclusions (highest priority)
    const isExcluded = excludeKeywords.some((keyword) => {
      const keywordLower = keyword.toLowerCase();
      return (
        name.includes(keywordLower) ||
        type.includes(keywordLower) ||
        combinedText.includes(keywordLower)
      );
    });

    if (isExcluded) {
      console.log(`❌ Excluded: ${facility.name} (matched exclusion keyword)`);
      return false;
    }

    // Check for strict medical keywords (highest priority for inclusion)
    const hasStrictMedicalKeyword = strictMedicalKeywords.some((keyword) => {
      const keywordLower = keyword.toLowerCase();
      return name.includes(keywordLower) || type.includes(keywordLower);
    });

    if (hasStrictMedicalKeyword) {
      console.log(`✅ Included: ${facility.name} (matched strict medical keyword)`);
      return true;
    }

    // For additional keywords, require at least 2 matches or specific patterns
    const additionalMatches = additionalMedicalKeywords.filter((keyword) => {
      const keywordLower = keyword.toLowerCase();
      return (
        name.includes(keywordLower) ||
        type.includes(keywordLower) ||
        combinedText.includes(keywordLower)
      );
    });

    // Also check if it's from a trusted source with medical type
    const isTrustedMedicalType =
      type === "hospital" ||
      type === "clinic" ||
      type === "medical" ||
      type === "healthcare" ||
      type === "urgent care" ||
      type === "emergency";

    if (additionalMatches.length >= 2 || isTrustedMedicalType) {
      console.log(`✅ Included: ${facility.name} (matched medical criteria)`);
      return true;
    }

    console.log(`❌ Excluded: ${facility.name} (insufficient medical indicators)`);
    return false;
  });
}

async function fetchFromMapboxPlaces(lat: number, lon: number, radiusMeters: number): Promise<ClinicFacility[] | null> {
  try {
    console.log(`Using coordinates: ${lat}, ${lon}`);

    const MAPBOX_TOKEN =
      (process.env.MAPBOX_ACCESS_TOKEN as string | undefined) ||
      (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN as string | undefined);
    if (!MAPBOX_TOKEN) {
      console.log("❌ No Mapbox token found in environment");
      return null;
    }
    console.log(`🔑 Mapbox token found (length: ${MAPBOX_TOKEN.length})`);

    // Use Mapbox Search Box API for POI search
    console.log("🏥 Querying Mapbox Search Box API for medical facilities...");
    const allResults: any[] = [];
    const radiusInDegrees = radiusMeters / 111000;
    const bbox = [
      lon - radiusInDegrees,
      lat - radiusInDegrees,
      lon + radiusInDegrees,
      lat + radiusInDegrees
    ].join(',');
    
    // Search using the Search Box API /forward endpoint (no session_token required)
    // This API is designed for one-off POI searches and returns proper medical facility data
    const searchTerms = [
      "hospital",
      "clinic",
      "medical center",
      "urgent care",
      "health center",
      "walk-in clinic"
    ];
    
    for (const searchTerm of searchTerms) {
      // Use Search Box API /forward endpoint for POI searches
      // Note: Using poi_category with specific medical categories for better filtering
      const url = `https://api.mapbox.com/search/searchbox/v1/forward?` +
        `q=${encodeURIComponent(searchTerm)}` +
        `&proximity=${lon},${lat}` +
        `&bbox=${bbox}` +
        `&country=ca` +
        `&types=poi` +
        `&poi_category=medical_clinic,hospital,emergency_room,doctors_office,health_services` +
        `&language=en` +
        `&limit=10` +
        `&access_token=${MAPBOX_TOKEN}`;
      
      console.log(`🔍 Searching Mapbox Search Box API for: "${searchTerm}"`);
      const res = await fetch(url);
      console.log(`📡 Response status: ${res.status}`);
      
      if (!res.ok) {
        console.log(`❌ API error: ${res.status} ${res.statusText}`);
        continue;
      }
      
      const data = await res.json();
      const features = data?.features || [];
      console.log(`✅ Found ${features.length} results for "${searchTerm}"`);
      
      if (features.length > 0) {
        allResults.push(...features);
      }
    }

    console.log(`📊 Total Mapbox Search Box results before deduplication: ${allResults.length}`);
    
    // Try OpenStreetMap as fallback if Mapbox returns no results
    if (allResults.length === 0) {
      console.log("⚠️ Mapbox Search Box returned no results, trying OpenStreetMap...");
      const overpassResults = await fetchFromOverpass(lat, lon, radiusMeters);
      
      if (overpassResults && overpassResults.length > 0) {
        console.log(`✅ Found ${overpassResults.length} facilities from OpenStreetMap`);
        return overpassResults;
      }
      
      console.log("❌ No results found from either Mapbox or OpenStreetMap");
      return null;
    }

    // Deduplicate by mapbox_id and map to ClinicFacility
    const seen = new Set<string>();
    const facilities: ClinicFacility[] = [];
    
    for (const feature of allResults) {
      const id: string = feature.properties?.mapbox_id || feature.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      // Get coordinates from geometry
      const coords_arr = feature.geometry?.coordinates;
      if (!Array.isArray(coords_arr) || coords_arr.length < 2) continue;
      const [feature_lon, feature_lat] = coords_arr;
      if (!Number.isFinite(feature_lat) || !Number.isFinite(feature_lon)) continue;

      const distance = calculateDistance(lat, lon, feature_lat, feature_lon);
      const props = feature.properties || {};
      const name: string = props.name || props.full_address || "Medical Facility";
      const address: string = props.full_address || props.address || "Address not available";
      const poiCategories = props.poi_category || [];
      const category = Array.isArray(poiCategories) && poiCategories.length > 0 
        ? poiCategories[0] 
        : "medical";

      // Try to get phone number and hours from metadata or external sources
      let phone: string | null = null;
      let hours: string | null = null;
      
      // Check if metadata contains phone information
      const metadata = props.metadata || {};
      if (metadata.phone) {
        phone = metadata.phone;
      }

      // If no phone and we have a Foursquare ID, try to fetch it
      const foursquareId = props.external_ids?.foursquare;
      if (!phone && foursquareId) {
        const FOURSQUARE_KEY = process.env.FOURSQUARE_SERVICE_KEY as string | undefined;
        if (FOURSQUARE_KEY) {
          try {
            const fsUrl = `https://api.foursquare.com/v3/places/${foursquareId}`;
            const fsRes = await fetch(fsUrl, {
              headers: { 'Authorization': FOURSQUARE_KEY }
            });
            if (fsRes.ok) {
              const fsData = await fsRes.json();
              phone = fsData.tel || null;
              // Try common hours fields from Foursquare response
              hours = (fsData.hours && (fsData.hours.display || fsData.hours.status)) ||
                      (fsData.popular && fsData.popular.status) ||
                      null;
              if (phone) {
                console.log(`📞 Got phone for ${name} from Foursquare: ${phone}`);
              }
              if (hours) {
                console.log(`🕒 Got hours for ${name} from Foursquare: ${hours}`);
              }
            }
          } catch {
            // Silently fail - phone is nice to have but not critical
          }
        }
      }

      facilities.push({
        id: `mapbox-searchbox-${id}`,
        name,
        type: category.toLowerCase(),
        address,
        phone,
        hours,
        coordinates: { latitude: feature_lat, longitude: feature_lon },
        distance,
        distanceText: distance < 1 ? `${(distance * 1000).toFixed(0)} meters` : `${distance.toFixed(1)} km`,
        source: "Mapbox Search Box API",
      });
    }

    console.log(`✅ Returning ${facilities.length} deduplicated facilities from Mapbox Search Box`);
    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("Mapbox Search Box API error:", error);
    return null;
  }
}

function getEnhancedAlbertaClinicsWithMoreOptions(
  location: string
): ClinicDataResponse {
  const normalizedLocation = location.toLowerCase();

  const cityClinics: Record<string, ClinicFacility[]> = {
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
    ],
  };

  if (normalizedLocation.includes("calgary")) {
    return {
      source: "Alberta Health Services",
      facilities: cityClinics.calgary,
    };
  } else if (normalizedLocation.includes("edmonton")) {
    return {
      source: "Alberta Health Services",
      facilities: cityClinics.edmonton,
    };
  }

  return {
    source: "Alberta Health Services",
    facilities: [
      {
        id: "fallback-default",
        name: "Alberta Health Services",
        type: "clinic",
        address: "10025 Jasper Ave, Edmonton, AB T5J 1S6",
        phone: "(780) 427-1432",
        hours: "Mon–Fri 8:00–17:00",
        coordinates: { latitude: 53.5354, longitude: -113.506 },
        distance: 0,
        distanceText: "Contact for nearest location",
        source: "Alberta Health Services",
      },
    ],
  };
}