import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const toLegacyWorkout = (
  workout: {
    _id: string;
    _creationTime: number;
    name?: string;
    title?: string;
    description?: string;
    content?: string;
    notes?: string;
    summary?: string;
  },
) => ({
  _id: workout._id,
  _creationTime: workout._creationTime,
  title: workout.name ?? workout.title ?? "Untitled workout",
  content: workout.description ?? workout.content ?? workout.notes ?? "",
  summary: workout.summary,
});

async function getCurrentUserIdOrNull(ctx: {
  auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
}

export const getWorkouts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    if (!userId) {
      return [];
    }

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_userId_and_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    return workouts.map(toLegacyWorkout);
  },
});

export const getWorkout = query({
  args: {
    id: v.optional(v.id("workouts")),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    if (!userId || !args.id) {
      return null;
    }

    const workout = await ctx.db.get(args.id);
    if (!workout || workout.userId !== userId) {
      return null;
    }

    return toLegacyWorkout(workout);
  },
});

export const createWorkout = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    isSummary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

    const now = Date.now();
    return await ctx.db.insert("workouts", {
      userId,
      status: "completed",
      origin: "manual",
      startedAt: now,
      completedAt: now,
      name: args.title,
      normalizedName: args.title.trim().toLowerCase(),
      description: args.content,
      notes: args.isSummary ? "AI summary disabled in structured-model migration." : undefined,
    });
  },
});

export const deleteWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserIdOrNull(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== userId) {
      throw new Error("Workout not found");
    }

    await ctx.db.delete(args.workoutId);
  },
});
