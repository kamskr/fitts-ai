import { mutation } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";

const resetOrder: TableNames[] = [
  "workoutSets",
  "workoutExercises",
  "templateSets",
  "templateExercises",
  "exerciseAliases",
  "workouts",
  "workoutTemplates",
  "programs",
  "measurements",
  "exercises",
];

async function deleteAllFromTable(ctx: Parameters<typeof mutation>[0] extends never ? never : any, tableName: TableNames) {
  while (true) {
    const batch = await ctx.db.query(tableName).take(128);
    if (batch.length === 0) {
      break;
    }

    for (const doc of batch) {
      await ctx.db.delete(doc._id);
    }
  }
}

export const resetDevelopmentData = mutation({
  args: {},
  handler: async (ctx) => {
    for (const tableName of resetOrder) {
      await deleteAllFromTable(ctx, tableName);
    }

    return { cleared: resetOrder };
  },
});
