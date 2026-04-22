import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUserId } from "./lib/auth";
import { normalizeName, optionalString } from "./lib/normalize";
import { getTemplateTree } from "./lib/readModels";
import { setGroupValidator, setPrescriptionValidator, setTypeValidator } from "./model";

const templateSetInputValidator = v.object({
  setGroup: setGroupValidator,
  setNumber: v.number(),
  setType: setTypeValidator,
  prescription: setPrescriptionValidator,
  notes: v.optional(v.string()),
});

const templateExerciseInputValidator = v.object({
  exerciseId: v.id("exercises"),
  notes: v.optional(v.string()),
  sets: v.array(templateSetInputValidator),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx);
    return await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId_and_archivedAt", (q) => q.eq("userId", userId).eq("archivedAt", undefined))
      .order("asc")
      .take(100);
  },
});

export const get = query({
  args: {
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const tree = await getTemplateTree(ctx, args.templateId);
    if (!tree || tree.template.userId !== userId) {
      return null;
    }
    return tree;
  },
});

export const create = mutation({
  args: {
    programId: v.optional(v.id("programs")),
    name: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    exercises: v.array(templateExerciseInputValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);

    if (args.programId) {
      const program = await ctx.db.get(args.programId);
      if (!program || program.userId !== userId) {
        throw new Error("Program not found");
      }
    }

    const templateId = await ctx.db.insert("workoutTemplates", {
      userId,
      programId: args.programId,
      name: args.name.trim(),
      normalizedName: normalizeName(args.name),
      description: optionalString(args.description),
      notes: optionalString(args.notes),
    });

    for (const [exerciseIndex, exerciseInput] of args.exercises.entries()) {
      const exercise = await ctx.db.get(exerciseInput.exerciseId);
      if (!exercise) {
        throw new Error(`Exercise ${exerciseInput.exerciseId} not found`);
      }

      const templateExerciseId = await ctx.db.insert("templateExercises", {
        templateId,
        order: exerciseIndex,
        exerciseId: exerciseInput.exerciseId,
        exerciseNameSnapshot: exercise.name,
        notes: optionalString(exerciseInput.notes),
      });

      for (const setInput of exerciseInput.sets) {
        await ctx.db.insert("templateSets", {
          templateExerciseId,
          setGroup: setInput.setGroup,
          setNumber: setInput.setNumber,
          setType: setInput.setType,
          prescription: setInput.prescription,
          notes: optionalString(setInput.notes),
        });
      }
    }

    return templateId;
  },
});

export const startWorkout = mutation({
  args: {
    templateId: v.id("workoutTemplates"),
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const tree = await getTemplateTree(ctx, args.templateId);
    if (!tree || tree.template.userId !== userId) {
      throw new Error("Template not found");
    }

    const program = tree.template.programId
      ? await ctx.db.get(tree.template.programId)
      : null;
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      status: "in_progress",
      origin: "template",
      startedAt: args.startedAt ?? Date.now(),
      name: tree.template.name,
      normalizedName: tree.template.normalizedName,
      description: tree.template.description,
      notes: tree.template.notes,
      basedOnTemplateId: tree.template._id,
      basedOnTemplateNameSnapshot: tree.template.name,
      basedOnProgramId: tree.template.programId,
      basedOnProgramNameSnapshot: program?.name,
    });

    for (const templateExercise of tree.exercises) {
      const workoutExerciseId = await ctx.db.insert("workoutExercises", {
        workoutId,
        order: templateExercise.order,
        exerciseId: templateExercise.exerciseId,
        exerciseNameSnapshot: templateExercise.exerciseNameSnapshot,
        basedOnTemplateExerciseId: templateExercise._id,
        notes: templateExercise.notes,
      });

      for (const templateSet of templateExercise.sets) {
        await ctx.db.insert("workoutSets", {
          workoutExerciseId,
          basedOnTemplateSetId: templateSet._id,
          setGroup: templateSet.setGroup,
          setNumber: templateSet.setNumber,
          setType: templateSet.setType,
          status: "pending",
          targetSnapshot: templateSet.prescription,
          actual: {},
          notes: templateSet.notes,
        });
      }
    }

    return workoutId;
  },
});
