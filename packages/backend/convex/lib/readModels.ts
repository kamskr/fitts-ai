import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

export async function getTemplateTree(ctx: DbCtx, templateId: Id<"workoutTemplates">) {
  const template = await ctx.db.get(templateId);
  if (!template) {
    return null;
  }

  const exercises = await ctx.db
    .query("templateExercises")
    .withIndex("by_templateId_and_order", (q) => q.eq("templateId", templateId))
    .order("asc")
    .take(128);

  const setsByExerciseId = new Map<Id<"templateExercises">, Doc<"templateSets">[]>();
  for (const exercise of exercises) {
    const sets = await ctx.db
      .query("templateSets")
      .withIndex("by_templateExerciseId_and_setGroup_and_setNumber", (q) =>
        q.eq("templateExerciseId", exercise._id),
      )
      .take(64);
    setsByExerciseId.set(exercise._id, sets);
  }

  return {
    template,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: setsByExerciseId.get(exercise._id) ?? [],
    })),
  };
}

export async function getWorkoutTree(ctx: DbCtx, workoutId: Id<"workouts">) {
  const workout = await ctx.db.get(workoutId);
  if (!workout) {
    return null;
  }

  const exercises = await ctx.db
    .query("workoutExercises")
    .withIndex("by_workoutId_and_order", (q) => q.eq("workoutId", workoutId))
    .order("asc")
    .take(256);

  const setsByExerciseId = new Map<Id<"workoutExercises">, Doc<"workoutSets">[]>();
  for (const exercise of exercises) {
    const sets = await ctx.db
      .query("workoutSets")
      .withIndex("by_workoutExerciseId_and_setGroup_and_setNumber", (q) =>
        q.eq("workoutExerciseId", exercise._id),
      )
      .take(128);
    setsByExerciseId.set(exercise._id, sets);
  }

  return {
    workout,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: setsByExerciseId.get(exercise._id) ?? [],
    })),
  };
}
