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
  args: { location: v.string() }, // Accept location as parameter instead of querying DB
  handler: async (ctx, args): Promise<ClinicDataResponse | null> => {
    console.log("📍 User location:", args.location);

    try {
      console.log("🔄 Trying Foursquare API...");
      const foursquareData = await fetchFromNewFoursquareAPI(
        args.location,
        10000
      );
      if (foursquareData && foursquareData.length > 0) {
        const filteredData = filterMedicalFacilities(foursquareData);
        console.log(`✅ Found ${filteredData.length} clinics via Foursquare`);
        if (filteredData.length > 0) {
          return { source: "Foursquare", facilities: filteredData };
        }
      }
    } catch (error) {
      console.log("Foursquare API failed:", error);
    }

    try {
      console.log("🔄 Trying OpenStreetMap API...");
      const osmData = await fetchFromOpenStreetMap(args.location, 10000);
      if (osmData && osmData.length > 0) {
        const filteredData = filterMedicalFacilities(osmData);
        console.log(`✅ Found ${filteredData.length} clinics via OSM`);
        if (filteredData.length > 0) {
          return { source: "OpenStreetMap", facilities: filteredData };
        }
      }
    } catch (error) {
      console.log("OpenStreetMap API failed:", error);
    }

    console.log("Using fallback Alberta clinic data");
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
    console.error("Geocoding error:", error);
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

function filterMedicalFacilities(
  facilities: ClinicFacility[]
): ClinicFacility[] {
  const medicalKeywords = [
    "hospital",
    "clinic",
    "medical",
    "health",
    "surgery",
    "care",
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
    "laboratory",
    "lab",
    "vet",
    "veterinary",
    "passport",
    "lasik",
    "optical",
    "optometrist",
  ];

  return facilities.filter((facility) => {
    const name = facility.name.toLowerCase();
    const type = facility.type.toLowerCase();
    const address = facility.address.toLowerCase();

    const isMedical = medicalKeywords.some(
      (keyword) =>
        name.includes(keyword) ||
        type.includes(keyword) ||
        address.includes(keyword)
    );

    const isExcluded = excludeKeywords.some(
      (keyword) => name.includes(keyword) || type.includes(keyword)
    );

    return isMedical && !isExcluded;
  });
}

async function fetchFromNewFoursquareAPI(
  location: string,
  radius: number
): Promise<ClinicFacility[] | null> {
  const FOURSQUARE_SERVICE_KEY = process.env.FOURSQUARE_SERVICE_KEY;

  if (!FOURSQUARE_SERVICE_KEY) {
    return null;
  }

  try {
    const coords = await geocodeWithNominatim(location);
    if (!coords) {
      return null;
    }

    const categories = "15014,15015,15017";
    const searchUrl = `https://places-api.foursquare.com/places/search?ll=${coords.lat},${coords.lon}&radius=${radius}&categories=${categories}&limit=20&sort=DISTANCE`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${FOURSQUARE_SERVICE_KEY}`,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-06-17",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const facilities: ClinicFacility[] = data.results
      .map((place: any) => {
        const placeId = place.fsq_place_id || place.fsq_id;
        const latitude = place.latitude || place.geocodes?.main?.latitude;
        const longitude = place.longitude || place.geocodes?.main?.longitude;

        if (!latitude || !longitude) {
          return null;
        }

        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          latitude,
          longitude
        );

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
          "Address not available";

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
      .filter(Boolean) as ClinicFacility[];

    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("Foursquare API error:", error);
    return null;
  }
}

async function fetchFromOpenStreetMap(
  location: string,
  radius: number
): Promise<ClinicFacility[] | null> {
  try {
    const coords = await geocodeWithNominatim(location);
    if (!coords) {
      return null;
    }

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${coords.lat},${coords.lon});
        node["amenity"="clinic"](around:${radius},${coords.lat},${coords.lon});
        node["healthcare"="hospital"](around:${radius},${coords.lat},${coords.lon});
        node["healthcare"="clinic"](around:${radius},${coords.lat},${coords.lon});
        way["amenity"="hospital"](around:${radius},${coords.lat},${coords.lon});
        way["amenity"="clinic"](around:${radius},${coords.lat},${coords.lon});
      );
      out body;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
    });

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      return null;
    }

    const facilities: ClinicFacility[] = data.elements
      .map((element: any) => {
        const tags = element.tags || {};
        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          element.lat,
          element.lon
        );

        const addressParts = [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:city"] || tags["addr:town"] || "Calgary",
          tags["addr:postcode"],
          tags["addr:province"] || "AB",
        ].filter(Boolean);

        const address =
          addressParts.length > 0
            ? addressParts.join(", ")
            : "Address not available";

        const amenity = tags.amenity || "";
        const healthcare = tags.healthcare || "";

        let facilityType = "medical";
        if (amenity === "hospital" || healthcare === "hospital")
          facilityType = "hospital";
        else if (amenity === "clinic" || healthcare === "clinic")
          facilityType = "clinic";

        return {
          id: `osm-${element.id}`,
          name: tags.name || tags.operator || "Medical Facility",
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
      .filter(Boolean) as ClinicFacility[];

    return facilities.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("OpenStreetMap error:", error);
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
        coordinates: { latitude: 53.5354, longitude: -113.506 },
        distance: 0,
        distanceText: "Contact for nearest location",
        source: "Alberta Health Services",
      },
    ],
  };
}