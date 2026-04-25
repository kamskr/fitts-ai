import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCandidates, loadStrongExerciseNames, normalize } from "./lib/exerciseMappingUtils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const datasetPath = path.resolve(__dirname, "../../../free-exercise-db/dist/exercises.json");
const strongCsvPath = path.resolve(__dirname, "../../../../strong_data/strong_workouts.csv");
const defaultOutputPath = path.resolve(
  __dirname,
  "../data/generated/strong-free-exercise-db.mapping-draft.json",
);
const outputPath = process.env.OUTPUT_PATH ? path.resolve(process.env.OUTPUT_PATH) : defaultOutputPath;

const dataset = JSON.parse(await fs.readFile(datasetPath, "utf8"));
const datasetByNormalizedName = new Map(dataset.map((exercise) => [normalize(exercise.name), exercise]));
const strongNames = await loadStrongExerciseNames(strongCsvPath);

const mappings = strongNames.map((sourceName) => {
  const exact = datasetByNormalizedName.get(normalize(sourceName));
  const candidates = getCandidates(sourceName, dataset);
  return {
    sourceSystem: "strong",
    sourceName,
    targetSourceDataset: "free-exercise-db",
    targetSourceExerciseKey: exact?.id ?? null,
    status: exact ? "auto_exact" : "needs_review",
    candidates,
  };
});

const draft = {
  generatedAt: new Date().toISOString(),
  sourceSystem: "strong",
  targetSourceDataset: "free-exercise-db",
  instructions: [
    "Review entries with status=needs_review.",
    "Set targetSourceExerciseKey to one candidate sourceExerciseKey or leave null to skip.",
    "Change status to reviewed before importing mappings you approve.",
  ],
  summary: {
    total: mappings.length,
    autoExact: mappings.filter((mapping) => mapping.status === "auto_exact").length,
    needsReview: mappings.filter((mapping) => mapping.status === "needs_review").length,
  },
  mappings,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`Wrote mapping draft to ${outputPath}`);
console.log(JSON.stringify(draft.summary, null, 2));
