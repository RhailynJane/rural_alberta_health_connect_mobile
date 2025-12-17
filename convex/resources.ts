import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get all resources
export const getAllResources = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("resources").collect();
  },
});

// Query to get resources by category
export const getResourcesByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resources")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Query to get a single resource by ID
export const getResourceById = query({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutation to seed resources (admin use)
export const seedResources = mutation({
  args: {
    resources: v.array(
      v.object({
        title: v.string(),
        subtitle: v.string(),
        icon: v.string(),
        iconColor: v.string(),
        bgGradient: v.array(v.string()),
        category: v.string(),
        importance: v.string(),
        readTime: v.string(),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Clear existing resources (optional - remove if you want to keep existing)
    const existingResources = await ctx.db.query("resources").collect();
    for (const resource of existingResources) {
      await ctx.db.delete(resource._id);
    }

    // Insert new resources
    const insertedIds = [];
    for (const resource of args.resources) {
      const id = await ctx.db.insert("resources", {
        ...resource,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(id);
    }

    return { success: true, count: insertedIds.length, ids: insertedIds };
  },
});

// Mutation to add a single resource
export const addResource = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    icon: v.string(),
    iconColor: v.string(),
    bgGradient: v.array(v.string()),
    category: v.string(),
    importance: v.string(),
    readTime: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("resources", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Mutation to update a resource
export const updateResource = mutation({
  args: {
    id: v.id("resources"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    icon: v.optional(v.string()),
    iconColor: v.optional(v.string()),
    bgGradient: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    importance: v.optional(v.string()),
    readTime: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Mutation to delete a resource
export const deleteResource = mutation({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
