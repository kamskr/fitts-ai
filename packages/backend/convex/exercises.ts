import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUserId } from "./lib/auth";
import { normalizeName, optionalString } from "./lib/normalize";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    const shared = await ctx.db
      .query("exercises")
      .withIndex("by_ownerUserId_and_archivedAt", (q) =>
        q.eq("ownerUserId", undefined).eq("archivedAt", undefined),
      )
      .take(200);
    const mine = await ctx.db
      .query("exercises")
      .withIndex("by_ownerUserId_and_archivedAt", (q) =>
        q.eq("ownerUserId", userId).eq("archivedAt", undefined),
      )
      .take(200);

    return [...shared, ...mine].sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    defaultWeightUnit: v.optional(v.union(v.literal("g"), v.literal("kg"), v.literal("lb"))),
    defaultDistanceUnit: v.optional(v.union(v.literal("m"), v.literal("km"), v.literal("ft"), v.literal("mi"))),
    equipment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    return await ctx.db.insert("exercises", {
      ownerUserId: userId,
      name: args.name.trim(),
      normalizedName: normalizeName(args.name),
      description: optionalString(args.description),
      notes: optionalString(args.notes),
      origin: "user",
      visibility: "private",
      defaultWeightUnit: args.defaultWeightUnit,
      defaultDistanceUnit: args.defaultDistanceUnit,
      equipment: optionalString(args.equipment),
    });
  },
});

export const createAlias = mutation({
  args: {
    exerciseId: v.id("exercises"),
    alias: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }
    if (exercise.ownerUserId && exercise.ownerUserId !== userId) {
      throw new Error("Not allowed to modify this exercise");
    }

    return await ctx.db.insert("exerciseAliases", {
      exerciseId: args.exerciseId,
      alias: args.alias.trim(),
      normalizedAlias: normalizeName(args.alias),
    });
  },
});

export const seedDemoExercises = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    const demos = [
      { name: "Bench Press", equipment: "Barbell" },
      { name: "Pull Up", equipment: "Bodyweight" },
      { name: "Romanian Deadlift", equipment: "Barbell" },
    ];

    const ids = [];
    for (const demo of demos) {
      const normalizedName = normalizeName(demo.name);
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_ownerUserId_and_normalizedName", (q) =>
          q.eq("ownerUserId", userId).eq("normalizedName", normalizedName),
        )
        .unique();

      if (existing) {
        ids.push(existing._id);
        continue;
      }

      const id = await ctx.db.insert("exercises", {
        ownerUserId: userId,
        name: demo.name,
        normalizedName,
        origin: "user",
        visibility: "private",
        equipment: demo.equipment,
        notes: "Seeded demo exercise for core UI testing.",
      });
      ids.push(id);
    }

    return ids;
  },
});

export const findMatch = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const normalized = normalizeName(args.name);

    const mine = await ctx.db
      .query("exercises")
      .withIndex("by_ownerUserId_and_normalizedName", (q) =>
        q.eq("ownerUserId", userId).eq("normalizedName", normalized),
      )
      .unique();
    if (mine) return mine;

    const shared = await ctx.db
      .query("exercises")
      .withIndex("by_normalizedName", (q) => q.eq("normalizedName", normalized))
      .take(10);
    const directShared = shared.find((exercise) => exercise.ownerUserId === undefined);
    if (directShared) return directShared;

    const aliases = await ctx.db
      .query("exerciseAliases")
      .withIndex("by_normalizedAlias", (q) => q.eq("normalizedAlias", normalized))
      .take(20);

    for (const alias of aliases) {
      const exercise = await ctx.db.get(alias.exerciseId);
      if (!exercise) continue;
      if (exercise.ownerUserId === userId || exercise.ownerUserId === undefined) {
        return exercise;
      }
    }

    return null;
  },
});
