import { v } from "convex/values";

export const workoutStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const setStatusValidator = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("skipped"),
);

export const setGroupValidator = v.union(
  v.literal("warmup"),
  v.literal("work"),
  v.literal("drop"),
  v.literal("failure"),
  v.literal("other"),
);

export const setTypeValidator = v.union(
  v.literal("normal"),
  v.literal("amrap"),
  v.literal("timed"),
  v.literal("distance"),
  v.literal("other"),
);

export const weightUnitValidator = v.union(
  v.literal("g"),
  v.literal("kg"),
  v.literal("lb"),
);

export const distanceUnitValidator = v.union(
  v.literal("m"),
  v.literal("km"),
  v.literal("ft"),
  v.literal("mi"),
);

export const bodyMeasurementUnitValidator = v.union(
  v.literal("mm"),
  v.literal("cm"),
  v.literal("in"),
);

export const measurementTypeValidator = v.union(
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
);

export const measurementSourceTypeValidator = v.union(
  v.literal("strong"),
  v.literal("apple_health"),
  v.literal("manual"),
  v.literal("other"),
);

export const exerciseOriginValidator = v.union(
  v.literal("system"),
  v.literal("user"),
  v.literal("copied"),
  v.literal("imported"),
);

export const workoutOriginValidator = v.union(
  v.literal("manual"),
  v.literal("template"),
  v.literal("import"),
);

export const exerciseVisibilityValidator = v.union(
  v.literal("private"),
  v.literal("shared_seed"),
);

export const repRangeValidator = v.object({
  min: v.number(),
  max: v.number(),
});

export const setPrescriptionValidator = v.object({
  weightGrams: v.optional(v.number()),
  weightValue: v.optional(v.number()),
  weightUnit: v.optional(weightUnitValidator),
  reps: v.optional(repRangeValidator),
  distanceMeters: v.optional(v.number()),
  distanceValue: v.optional(v.number()),
  distanceUnit: v.optional(distanceUnitValidator),
  durationSeconds: v.optional(v.number()),
  rpe: v.optional(v.number()),
  restSeconds: v.optional(v.number()),
});

export const setPerformanceValidator = v.object({
  weightGrams: v.optional(v.number()),
  weightValue: v.optional(v.number()),
  weightUnit: v.optional(weightUnitValidator),
  reps: v.optional(v.number()),
  distanceMeters: v.optional(v.number()),
  distanceValue: v.optional(v.number()),
  distanceUnit: v.optional(distanceUnitValidator),
  durationSeconds: v.optional(v.number()),
  rpe: v.optional(v.number()),
});

export const workoutImportMetadataValidator = v.object({
  sourceFile: v.string(),
  sourceSystem: v.literal("strong"),
  sourceWorkoutKey: v.string(),
  sourceDateRaw: v.string(),
  sourceDurationRaw: v.optional(v.string()),
  sourceWorkoutNotes: v.optional(v.string()),
});

export const workoutExerciseImportMetadataValidator = v.object({
  sourceExerciseName: v.string(),
  sourceBlockIndex: v.number(),
});

export const workoutSetImportMetadataValidator = v.object({
  sourceRowIndex: v.number(),
  sourceSetOrderRaw: v.string(),
  sourceNotes: v.optional(v.string()),
  rawRow: v.object({
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
  }),
});

export const measurementImportMetadataValidator = v.object({
  sourceFile: v.string(),
  rawRow: v.object({
    date: v.string(),
    measurementType: v.string(),
    value: v.number(),
    unit: v.string(),
    source: v.string(),
  }),
});
