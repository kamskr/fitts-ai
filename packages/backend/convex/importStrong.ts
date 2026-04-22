import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireCurrentUserId } from "./lib/auth";
import { normalizeName, optionalString, optionalNumber } from "./lib/normalize";
import { toCanonicalMeasurement, toCanonicalWeight } from "./lib/units";

const strongWorkoutRowValidator = v.object({
  date: v.string(),
  workoutName: v.string(),
  duration: v.optional(v.string()),
  exerciseName: v.string(),
  setOrder: v.string(),
  weight: v.optional(v.number()),
  reps: v.optional(v.number()),
  distance: v.optional(v.number()),
  seconds: v.optional(v.number()),
  notes: v.optional(v.string()),
  workoutNotes: v.optional(v.string()),
  rpe: v.optional(v.number()),
});

const strongMeasurementRowValidator = v.object({
  date: v.string(),
  measurementType: v.union(
    v.literal("weight"),
    v.literal("body_fat_percentage"),
    v.literal("chest"),
    v.literal("hips"),
    v.literal("left_bicep"),
    v.literal("right_bicep"),
    v.literal("left_calf"),
    v.literal("right_calf"),
    v.literal("left_forearm"),
    v.literal("right_forearm"),
    v.literal("left_thigh"),
    v.literal("right_thigh"),
    v.literal("lower_abs"),
    v.literal("upper_abs"),
    v.literal("neck"),
    v.literal("shoulders"),
    v.literal("waist"),
  ),
  value: v.number(),
  unit: v.string(),
  source: v.string(),
});

function inferSetGroup(setOrderRaw: string) {
  const normalized = setOrderRaw.trim().toLowerCase();
  if (normalized === "w") return "warmup" as const;
  if (normalized === "d") return "drop" as const;
  if (normalized === "f") return "failure" as const;
  return "work" as const;
}

function inferSetType(row: { distance?: number; seconds?: number }) {
  if ((row.distance ?? 0) > 0) return "distance" as const;
  if ((row.seconds ?? 0) > 0) return "timed" as const;
  return "normal" as const;
}

async function matchExerciseId(ctx: Parameters<typeof mutation>[0] extends never ? never : any, userId: string, exerciseName: string): Promise<Id<"exercises"> | undefined> {
  const normalizedName = normalizeName(exerciseName);
  const mine = await ctx.db
    .query("exercises")
    .withIndex("by_ownerUserId_and_normalizedName", (q: any) =>
      q.eq("ownerUserId", userId).eq("normalizedName", normalizedName),
    )
    .unique();
  if (mine) return mine._id;

  const shared = await ctx.db
    .query("exercises")
    .withIndex("by_normalizedName", (q: any) => q.eq("normalizedName", normalizedName))
    .take(10);
  const directShared = shared.find((exercise: any) => exercise.ownerUserId === undefined);
  if (directShared) return directShared._id;

  const aliases = await ctx.db
    .query("exerciseAliases")
    .withIndex("by_normalizedAlias", (q: any) => q.eq("normalizedAlias", normalizedName))
    .take(20);
  for (const alias of aliases) {
    const exercise = await ctx.db.get(alias.exerciseId);
    if (!exercise) continue;
    if (exercise.ownerUserId === undefined || exercise.ownerUserId === userId) {
      return exercise._id;
    }
  }

  return undefined;
}

export const importWorkoutSession = mutation({
  args: {
    sourceFile: v.string(),
    sourceWorkoutKey: v.string(),
    rows: v.array(strongWorkoutRowValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    if (args.rows.length === 0) {
      throw new Error("No rows to import");
    }

    const firstRow = args.rows[0];
    const startedAt = new Date(firstRow.date).getTime();
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      status: "completed",
      origin: "import",
      startedAt,
      completedAt: startedAt,
      name: firstRow.workoutName,
      normalizedName: normalizeName(firstRow.workoutName),
      notes: optionalString(firstRow.workoutNotes),
      importMetadata: {
        sourceFile: args.sourceFile,
        sourceSystem: "strong",
        sourceWorkoutKey: args.sourceWorkoutKey,
        sourceDateRaw: firstRow.date,
        sourceDurationRaw: optionalString(firstRow.duration),
        sourceWorkoutNotes: optionalString(firstRow.workoutNotes),
      },
    });

    let currentWorkoutExerciseId: Id<"workoutExercises"> | undefined;
    let currentExerciseName: string | undefined;
    let currentBlockIndex = -1;

    for (let rowIndex = 0; rowIndex < args.rows.length; rowIndex += 1) {
      const row = args.rows[rowIndex];
      if (row.exerciseName !== currentExerciseName) {
        currentExerciseName = row.exerciseName;
        currentBlockIndex += 1;
        currentWorkoutExerciseId = await ctx.db.insert("workoutExercises", {
          workoutId,
          order: currentBlockIndex,
          exerciseId: await matchExerciseId(ctx, userId, row.exerciseName),
          exerciseNameSnapshot: row.exerciseName,
          notes: optionalString(row.notes),
          importMetadata: {
            sourceExerciseName: row.exerciseName,
            sourceBlockIndex: currentBlockIndex,
          },
        });
      }

      if (!currentWorkoutExerciseId) {
        throw new Error("Failed to create workout exercise during import");
      }

      const weightValue = optionalNumber(row.weight);
      await ctx.db.insert("workoutSets", {
        workoutExerciseId: currentWorkoutExerciseId,
        setGroup: inferSetGroup(row.setOrder),
        setNumber: rowIndex + 1,
        setType: inferSetType(row),
        status: "completed",
        targetSnapshot: {},
        actual: {
          weightGrams: weightValue !== undefined ? toCanonicalWeight(weightValue, "kg") : undefined,
          weightValue,
          weightUnit: weightValue !== undefined ? "kg" : undefined,
          reps: optionalNumber(row.reps),
          distanceMeters: optionalNumber(row.distance),
          distanceValue: optionalNumber(row.distance),
          distanceUnit: row.distance !== undefined ? "m" : undefined,
          durationSeconds: optionalNumber(row.seconds),
          rpe: optionalNumber(row.rpe),
        },
        notes: optionalString(row.notes),
        importMetadata: {
          sourceRowIndex: rowIndex,
          sourceSetOrderRaw: row.setOrder,
          sourceNotes: optionalString(row.notes),
          rawRow: row,
        },
      });
    }

    return workoutId;
  },
});

export const importMeasurements = mutation({
  args: {
    sourceFile: v.string(),
    rows: v.array(strongMeasurementRowValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const insertedIds: Id<"measurements">[] = [];

    for (const row of args.rows) {
      const canonical = toCanonicalMeasurement(row.value, row.unit);
      const sourceName = optionalString(row.source);
      const sourceType =
        sourceName === "Apple Health"
          ? "apple_health"
          : sourceName === "Strong"
            ? "strong"
            : "other";

      const measurementId = await ctx.db.insert("measurements", {
        userId,
        occurredAt: new Date(row.date).getTime(),
        type: row.measurementType,
        valueCanonical: canonical.valueCanonical,
        canonicalUnit: canonical.canonicalUnit,
        valueOriginal: row.value,
        originalUnit: row.unit,
        sourceType,
        sourceName,
        importMetadata: {
          sourceFile: args.sourceFile,
          rawRow: row,
        },
      });
      insertedIds.push(measurementId);
    }

    return insertedIds;
  },
});
