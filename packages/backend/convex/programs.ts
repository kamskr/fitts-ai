import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUserId } from "./lib/auth";
import { normalizeName, optionalString } from "./lib/normalize";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    return await ctx.db
      .query("programs")
      .withIndex("by_userId_and_archivedAt", (q) => q.eq("userId", userId).eq("archivedAt", undefined))
      .order("asc")
      .take(100);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    return await ctx.db.insert("programs", {
      userId,
      name: args.name.trim(),
      normalizedName: normalizeName(args.name),
      description: optionalString(args.description),
      notes: optionalString(args.notes),
    });
  },
});

export const get = query({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const program = await ctx.db.get(args.programId);
    if (!program || program.userId !== userId) {
      return null;
    }

    const templates = await ctx.db
      .query("workoutTemplates")
      .withIndex("by_programId_and_archivedAt", (q) =>
        q.eq("programId", args.programId).eq("archivedAt", undefined),
      )
      .order("asc")
      .take(100);

    return { ...program, templates };
  },
});
