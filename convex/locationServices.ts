import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Mutation to toggle location services - FIXED NULL CHECKING
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
      const profileId = await ctx.db.insert("userProfiles", {
        userId,
        locationServicesEnabled: args.enabled,
        onboardingCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      profile = await ctx.db.get(profileId);
      
      // Check if profile was successfully created
      if (!profile) {
        throw new ConvexError("Failed to create user profile");
      }
    }

    // Update existing profile
    await ctx.db.patch(profile._id, {
      locationServicesEnabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to update user location - FIXED NULL CHECKING
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
      const profileId = await ctx.db.insert("userProfiles", {
        userId,
        location: args.location,
        onboardingCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      profile = await ctx.db.get(profileId);
      
      // Check if profile was successfully created
      if (!profile) {
        throw new ConvexError("Failed to create user profile");
      }
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