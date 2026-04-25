import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  exerciseCategoryValidator,
  exerciseDifficultyValidator,
  exerciseForceValidator,
  exerciseMechanicValidator,
} from "./model";
import { requireCurrentUserId } from "./lib/auth";
import { normalizeName, optionalString } from "./lib/normalize";

const seededMuscleInputValidator = v.object({
  muscle: v.string(),
  role: v.union(v.literal("primary"), v.literal("secondary")),
  order: v.number(),
});

const seededInstructionInputValidator = v.object({
  stepNumber: v.number(),
  text: v.string(),
});

const seededMediaInputValidator = v.object({
  kind: v.union(v.literal("image"), v.literal("gif"), v.literal("video")),
  url: v.string(),
  order: v.number(),
  source: v.optional(v.string()),
});

const seededExerciseInputValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  equipment: v.optional(v.string()),
  category: v.optional(exerciseCategoryValidator),
  force: v.optional(exerciseForceValidator),
  mechanic: v.optional(exerciseMechanicValidator),
  difficultyLevel: v.optional(exerciseDifficultyValidator),
  sourceDataset: v.string(),
  sourceExerciseKey: v.string(),
  muscles: v.array(seededMuscleInputValidator),
  instructions: v.array(seededInstructionInputValidator),
  media: v.array(seededMediaInputValidator),
});

const importMappingInputValidator = v.object({
  sourceSystem: v.string(),
  sourceName: v.string(),
  targetSourceDataset: v.string(),
  targetSourceExerciseKey: v.string(),
});

async function deleteExerciseChildren(ctx: { db: typeof import("./_generated/server").mutation extends never ? never : any }, exerciseId: Id<"exercises">) {
  const [aliases, importMappings, muscles, instructions, media] = await Promise.all([
    ctx.db
      .query("exerciseAliases")
      .withIndex("by_exerciseId_and_normalizedAlias", (q: any) => q.eq("exerciseId", exerciseId))
      .take(256),
    ctx.db
      .query("exerciseImportMappings")
      .withIndex("by_exerciseId_and_sourceSystem", (q: any) => q.eq("exerciseId", exerciseId))
      .take(256),
    ctx.db
      .query("exerciseMuscles")
      .withIndex("by_exerciseId_and_order", (q: any) => q.eq("exerciseId", exerciseId))
      .take(64),
    ctx.db
      .query("exerciseInstructions")
      .withIndex("by_exerciseId_and_stepNumber", (q: any) => q.eq("exerciseId", exerciseId))
      .take(64),
    ctx.db
      .query("exerciseMedia")
      .withIndex("by_exerciseId_and_order", (q: any) => q.eq("exerciseId", exerciseId))
      .take(64),
  ]);

  for (const row of aliases) await ctx.db.delete(row._id);
  for (const row of importMappings) await ctx.db.delete(row._id);
  for (const row of muscles) await ctx.db.delete(row._id);
  for (const row of instructions) await ctx.db.delete(row._id);
  for (const row of media) await ctx.db.delete(row._id);
}

async function upsertSeededExercise(
  ctx: { db: typeof import("./_generated/server").mutation extends never ? never : any },
  exercise: {
    name: string;
    description?: string;
    notes?: string;
    equipment?: string;
    category?: "powerlifting" | "strength" | "stretching" | "cardio" | "olympic weightlifting" | "strongman" | "plyometrics";
    force?: "static" | "pull" | "push";
    mechanic?: "isolation" | "compound";
    difficultyLevel?: "beginner" | "intermediate" | "expert";
    sourceDataset: string;
    sourceExerciseKey: string;
    muscles: { muscle: string; role: "primary" | "secondary"; order: number }[];
    instructions: { stepNumber: number; text: string }[];
    media: { kind: "image" | "gif" | "video"; url: string; order: number; source?: string }[];
  },
) {
  const existing = await ctx.db
    .query("exercises")
    .withIndex("by_sourceDataset_and_sourceExerciseKey", (q: any) =>
      q.eq("sourceDataset", exercise.sourceDataset).eq("sourceExerciseKey", exercise.sourceExerciseKey),
    )
    .unique();

  const exerciseId = existing
    ? existing._id
    : await ctx.db.insert("exercises", {
        ownerUserId: undefined,
        name: exercise.name.trim(),
        normalizedName: normalizeName(exercise.name),
        description: optionalString(exercise.description),
        notes: optionalString(exercise.notes),
        origin: "system",
        visibility: "shared_seed",
        equipment: optionalString(exercise.equipment),
        category: exercise.category,
        force: exercise.force,
        mechanic: exercise.mechanic,
        difficultyLevel: exercise.difficultyLevel,
        sourceDataset: exercise.sourceDataset,
        sourceExerciseKey: exercise.sourceExerciseKey,
      });

  if (existing) {
    await ctx.db.patch(exerciseId, {
      name: exercise.name.trim(),
      normalizedName: normalizeName(exercise.name),
      description: optionalString(exercise.description),
      notes: optionalString(exercise.notes),
      equipment: optionalString(exercise.equipment),
      category: exercise.category,
      force: exercise.force,
      mechanic: exercise.mechanic,
      difficultyLevel: exercise.difficultyLevel,
      sourceDataset: exercise.sourceDataset,
      sourceExerciseKey: exercise.sourceExerciseKey,
      archivedAt: undefined,
    });
    await deleteExerciseChildren(ctx, exerciseId);
  }

  for (const muscle of exercise.muscles) {
    await ctx.db.insert("exerciseMuscles", {
      exerciseId,
      muscle: muscle.muscle,
      role: muscle.role,
      order: muscle.order,
    });
  }

  await ctx.db.insert("exerciseImportMappings", {
    exerciseId,
    sourceSystem: exercise.sourceDataset,
    sourceName: exercise.name,
    normalizedSourceName: normalizeName(exercise.name),
  });

  for (const instruction of exercise.instructions) {
    await ctx.db.insert("exerciseInstructions", {
      exerciseId,
      stepNumber: instruction.stepNumber,
      text: instruction.text,
    });
  }

  for (const media of exercise.media) {
    await ctx.db.insert("exerciseMedia", {
      exerciseId,
      kind: media.kind,
      url: media.url,
      order: media.order,
      source: optionalString(media.source),
    });
  }

  return exerciseId;
}

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

export const get = query({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      return null;
    }
    if (exercise.ownerUserId && exercise.ownerUserId !== userId) {
      return null;
    }

    const [aliases, importMappings, muscles, instructions, media] = await Promise.all([
      ctx.db
        .query("exerciseAliases")
        .withIndex("by_exerciseId_and_normalizedAlias", (q) => q.eq("exerciseId", args.exerciseId))
        .take(64),
      ctx.db
        .query("exerciseImportMappings")
        .withIndex("by_exerciseId_and_sourceSystem", (q) => q.eq("exerciseId", args.exerciseId))
        .take(64),
      ctx.db
        .query("exerciseMuscles")
        .withIndex("by_exerciseId_and_order", (q) => q.eq("exerciseId", args.exerciseId))
        .order("asc")
        .take(32),
      ctx.db
        .query("exerciseInstructions")
        .withIndex("by_exerciseId_and_stepNumber", (q) => q.eq("exerciseId", args.exerciseId))
        .order("asc")
        .take(32),
      ctx.db
        .query("exerciseMedia")
        .withIndex("by_exerciseId_and_order", (q) => q.eq("exerciseId", args.exerciseId))
        .order("asc")
        .take(32),
    ]);

    return {
      ...exercise,
      aliases,
      importMappings,
      muscles,
      instructions,
      media,
    };
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
    category: v.optional(exerciseCategoryValidator),
    force: v.optional(exerciseForceValidator),
    mechanic: v.optional(exerciseMechanicValidator),
    difficultyLevel: v.optional(exerciseDifficultyValidator),
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
      category: args.category,
      force: args.force,
      mechanic: args.mechanic,
      difficultyLevel: args.difficultyLevel,
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

export const createImportMapping = mutation({
  args: {
    exerciseId: v.id("exercises"),
    sourceSystem: v.string(),
    sourceName: v.string(),
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

    return await ctx.db.insert("exerciseImportMappings", {
      exerciseId: args.exerciseId,
      sourceSystem: args.sourceSystem.trim().toLowerCase(),
      sourceName: args.sourceName.trim(),
      normalizedSourceName: normalizeName(args.sourceName),
    });
  },
});

export const importMappingBatch = mutation({
  args: {
    mappings: v.array(importMappingInputValidator),
  },
  handler: async (ctx, args) => {
    const importedMappingIds: Id<"exerciseImportMappings">[] = [];
    const skipped: { sourceSystem: string; sourceName: string; reason: string }[] = [];

    for (const mapping of args.mappings) {
      const targetExercise = await ctx.db
        .query("exercises")
        .withIndex("by_sourceDataset_and_sourceExerciseKey", (q) =>
          q
            .eq("sourceDataset", mapping.targetSourceDataset)
            .eq("sourceExerciseKey", mapping.targetSourceExerciseKey),
        )
        .unique();

      if (!targetExercise) {
        skipped.push({
          sourceSystem: mapping.sourceSystem,
          sourceName: mapping.sourceName,
          reason: "target exercise not found",
        });
        continue;
      }

      const sourceSystem = mapping.sourceSystem.trim().toLowerCase();
      const normalizedSourceName = normalizeName(mapping.sourceName);
      const existingMappings = await ctx.db
        .query("exerciseImportMappings")
        .withIndex("by_sourceSystem_and_normalizedSourceName", (q) =>
          q.eq("sourceSystem", sourceSystem).eq("normalizedSourceName", normalizedSourceName),
        )
        .take(20);

      for (const existingMapping of existingMappings) {
        await ctx.db.delete(existingMapping._id);
      }

      const mappingId = await ctx.db.insert("exerciseImportMappings", {
        exerciseId: targetExercise._id,
        sourceSystem,
        sourceName: mapping.sourceName.trim(),
        normalizedSourceName,
      });
      importedMappingIds.push(mappingId);
    }

    return {
      imported: importedMappingIds.length,
      skipped,
      mappingIds: importedMappingIds,
    };
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

export const importSeedBatch = mutation({
  args: {
    exercises: v.array(seededExerciseInputValidator),
  },
  handler: async (ctx, args) => {
    const importedExerciseIds: Id<"exercises">[] = [];
    for (const exercise of args.exercises) {
      const exerciseId = await upsertSeededExercise(ctx, exercise);
      importedExerciseIds.push(exerciseId);
    }

    return {
      imported: importedExerciseIds.length,
      exerciseIds: importedExerciseIds,
    };
  },
});

export const findMatch = query({
  args: {
    name: v.string(),
    sourceSystem: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const normalized = normalizeName(args.name);

    if (args.sourceSystem) {
      const sourceSystem = args.sourceSystem.trim().toLowerCase();
      const importMappings = await ctx.db
        .query("exerciseImportMappings")
        .withIndex("by_sourceSystem_and_normalizedSourceName", (q) =>
          q.eq("sourceSystem", sourceSystem).eq("normalizedSourceName", normalized),
        )
        .take(20);

      for (const mapping of importMappings) {
        const exercise = await ctx.db.get(mapping.exerciseId);
        if (!exercise) continue;
        if (exercise.ownerUserId === userId || exercise.ownerUserId === undefined) {
          return exercise;
        }
      }
    }

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
