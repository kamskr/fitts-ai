import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultMappingPath = path.resolve(
  __dirname,
  "../data/generated/strong-free-exercise-db.mapping-draft.json",
);
const mappingPath = process.env.MAPPING_PATH ? path.resolve(process.env.MAPPING_PATH) : defaultMappingPath;
const batchSize = Number(process.env.EXERCISE_MAPPING_BATCH_SIZE ?? "25");
const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing CONVEX_URL. Set it before running pnpm --filter @packages/backend seed:exercise-mappings");
}

const raw = await fs.readFile(mappingPath, "utf8");
const draft = JSON.parse(raw);
const approvedMappings = draft.mappings
  .filter((mapping) => mapping.targetSourceExerciseKey)
  .filter((mapping) => mapping.status === "auto_exact" || mapping.status === "reviewed")
  .map((mapping) => ({
    sourceSystem: mapping.sourceSystem,
    sourceName: mapping.sourceName,
    targetSourceDataset: mapping.targetSourceDataset,
    targetSourceExerciseKey: mapping.targetSourceExerciseKey,
  }));

const client = new ConvexHttpClient(convexUrl);
let imported = 0;
let skipped = [];

for (let index = 0; index < approvedMappings.length; index += batchSize) {
  const batch = approvedMappings.slice(index, index + batchSize);
  const result = await client.mutation(api.exercises.importMappingBatch, { mappings: batch });
  imported += result.imported;
  skipped = skipped.concat(result.skipped);
  console.log(`Imported ${imported}/${approvedMappings.length} approved mappings`);
}

console.log(JSON.stringify({ imported, skipped }, null, 2));
