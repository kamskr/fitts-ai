import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const datasetPath = path.resolve(__dirname, "../../../free-exercise-db/dist/exercises.json");
const batchSize = Number(process.env.EXERCISE_SEED_BATCH_SIZE ?? "15");
const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing CONVEX_URL. Set it before running pnpm --filter @packages/backend seed:exercises");
}

function optionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function toSeedExercise(row) {
  return {
    name: row.name,
    description: undefined,
    notes: undefined,
    equipment: optionalString(row.equipment),
    category: row.category ?? undefined,
    force: row.force ?? undefined,
    mechanic: row.mechanic ?? undefined,
    difficultyLevel: row.level ?? undefined,
    sourceDataset: "free-exercise-db",
    sourceExerciseKey: row.id,
    muscles: [
      ...row.primaryMuscles.map((muscle, index) => ({
        muscle,
        role: "primary",
        order: index,
      })),
      ...row.secondaryMuscles.map((muscle, index) => ({
        muscle,
        role: "secondary",
        order: index,
      })),
    ],
    instructions: row.instructions.map((text, index) => ({
      stepNumber: index + 1,
      text,
    })),
    media: row.images.map((imagePath, index) => ({
      kind: "image",
      url: `free-exercise-db/exercises/${imagePath}`,
      order: index,
      source: "free-exercise-db",
    })),
  };
}

const raw = await fs.readFile(datasetPath, "utf8");
const dataset = JSON.parse(raw);
const client = new ConvexHttpClient(convexUrl);

let imported = 0;
for (let index = 0; index < dataset.length; index += batchSize) {
  const batch = dataset.slice(index, index + batchSize).map(toSeedExercise);
  const result = await client.mutation(api.exercises.importSeedBatch, { exercises: batch });
  imported += result.imported;
  console.log(`Imported ${imported}/${dataset.length}`);
}

console.log(`Done. Imported ${imported} exercises from ${datasetPath}`);
