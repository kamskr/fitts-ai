import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUserId } from "./lib/auth";
import { optionalString } from "./lib/normalize";
import { getWorkoutTree } from "./lib/readModels";
import { setPerformanceValidator, setStatusValidator } from "./model";

async function requireOwnedWorkout(ctx: Parameters<typeof mutation>[0] extends never ? never : { db: { get: <T>(id: Id<any>) => Promise<T | null> } }, workoutId: Id<"workouts">, userId: string) {
  const workout = await ctx.db.get(workoutId);
  if (!workout || (workout as Doc<"workouts">).userId !== userId) {
    throw new Error("Workout not found");
  }
  return workout as Doc<"workouts">;
}

function toPrescriptionFromActual(
  existing: Doc<"templateSets">["prescription"],
  actual: Doc<"workoutSets">["actual"],
): Doc<"templateSets">["prescription"] {
  return {
    ...existing,
    weightGrams: actual.weightGrams ?? existing.weightGrams,
    weightValue: actual.weightValue ?? existing.weightValue,
    weightUnit: actual.weightUnit ?? existing.weightUnit,
    reps:
      actual.reps !== undefined
        ? { min: actual.reps, max: actual.reps }
        : existing.reps,
    distanceMeters: actual.distanceMeters ?? existing.distanceMeters,
    distanceValue: actual.distanceValue ?? existing.distanceValue,
    distanceUnit: actual.distanceUnit ?? existing.distanceUnit,
    durationSeconds: actual.durationSeconds ?? existing.durationSeconds,
    rpe: actual.rpe ?? existing.rpe,
  };
}

export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    return await ctx.db
      .query("workouts")
      .withIndex("by_userId_and_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const tree = await getWorkoutTree(ctx, args.workoutId);
    if (!tree || tree.workout.userId !== userId) {
      return null;
    }
    return tree;
  },
});

export const updateSet = mutation({
  args: {
    workoutSetId: v.id("workoutSets"),
    status: v.optional(setStatusValidator),
    actual: v.optional(setPerformanceValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const workoutSet = await ctx.db.get(args.workoutSetId);
    if (!workoutSet) {
      throw new Error("Workout set not found");
    }
    const workoutExercise = await ctx.db.get(workoutSet.workoutExerciseId);
    if (!workoutExercise) {
      throw new Error("Workout exercise not found");
    }
    await requireOwnedWorkout(ctx, workoutExercise.workoutId, userId);

    const patch: Partial<Doc<"workoutSets">> = {};
    if (args.status) patch.status = args.status;
    if (args.actual) patch.actual = args.actual;
    if (args.notes !== undefined) patch.notes = optionalString(args.notes);
    await ctx.db.patch(args.workoutSetId, patch);
  },
});

export const completeWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const workout = await requireOwnedWorkout(ctx, args.workoutId, userId);
    const tree = await getWorkoutTree(ctx, args.workoutId);
    if (!tree) {
      throw new Error("Workout not found");
    }

    await ctx.db.patch(args.workoutId, {
      status: "completed",
      completedAt: args.completedAt ?? Date.now(),
      cancelledAt: undefined,
    });

    if (!workout.basedOnTemplateId) {
      return args.workoutId;
    }

    for (const workoutExercise of tree.exercises) {
      for (const workoutSet of workoutExercise.sets) {
        if (workoutSet.status !== "completed" || !workoutSet.basedOnTemplateSetId) {
          continue;
        }

        const templateSet = await ctx.db.get(workoutSet.basedOnTemplateSetId);
        if (!templateSet) {
          continue;
        }

        await ctx.db.patch(templateSet._id, {
          prescription: toPrescriptionFromActual(templateSet.prescription, workoutSet.actual),
        });
      }
    }

    return args.workoutId;
  },
});

export const cancelWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    await requireOwnedWorkout(ctx, args.workoutId, userId);
    await ctx.db.patch(args.workoutId, {
      status: "cancelled",
      cancelledAt: Date.now(),
    });
  },
});
