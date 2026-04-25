import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCandidates, loadStrongExerciseNames, normalize } from "./lib/exerciseMappingUtils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const datasetPath = path.resolve(__dirname, "../../../free-exercise-db/dist/exercises.json");
const strongCsvPath = path.resolve(__dirname, "../../../../strong_data/strong_workouts.csv");

const dataset = JSON.parse(await fs.readFile(datasetPath, "utf8"));
const strongNames = await loadStrongExerciseNames(strongCsvPath);
const datasetByNormalizedName = new Map(dataset.map((exercise) => [normalize(exercise.name), exercise]));

const exactMatches = [];
const missing = [];

for (const strongName of strongNames) {
  const exact = datasetByNormalizedName.get(normalize(strongName));
  if (exact) {
    exactMatches.push({ strongName, datasetName: exact.name });
    continue;
  }

  missing.push({
    strongName,
    candidates: getCandidates(strongName, dataset, 5).map((candidate) => ({
      name: candidate.name,
      sourceExerciseKey: candidate.sourceExerciseKey,
      score: candidate.score,
    })),
  });
}

console.log(
  JSON.stringify(
    {
      strongUniqueNames: strongNames.length,
      datasetExercises: dataset.length,
      exactMatches: exactMatches.length,
      missing: missing.length,
      sampleMissing: missing.slice(0, 25),
    },
    null,
    2,
  ),
);
