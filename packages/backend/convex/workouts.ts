import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "../convex/_generated/api";
import { Auth } from "convex/server";

export const getUserId = async (ctx: { auth: Auth }) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

export const getWorkouts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const workouts = await ctx.db
      .query("workouts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return workouts;
  },
});

export const getWorkout = query({
  args: {
    id: v.optional(v.id("workouts")),
  },
  handler: async (ctx, args) => {
    const { id } = args;
    if (!id) return null;
    const workout = await ctx.db.get(id);
    return workout;
  },
});

export const createWorkout = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    isSummary: v.boolean(),
  },
  handler: async (ctx, { title, content, isSummary }) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");
    const workoutId = await ctx.db.insert("workouts", { userId, title, content });

    if (isSummary) {
      await ctx.scheduler.runAfter(0, internal.openai.summary, {
        id: workoutId,
        title,
        content,
      });
    }

    return workoutId;
  },
});

export const deleteWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.workoutId);
  },
});
