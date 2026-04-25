import fs from "node:fs/promises";

export const DEFAULT_STOPWORDS = new Set([
  "and",
  "the",
  "a",
  "an",
  "grip",
  "seated",
  "standing",
]);

export function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function tokenize(value, stopwords = DEFAULT_STOPWORDS) {
  return normalize(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !stopwords.has(token));
}

export function parseCsvLine(line) {
  const columns = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  columns.push(current);
  return columns;
}

export async function loadStrongExerciseNames(strongCsvPath) {
  const strongCsv = await fs.readFile(strongCsvPath, "utf8");
  return Array.from(
    new Set(
      strongCsv
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map(parseCsvLine)
        .map((columns) => columns[3])
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function scoreCandidate(sourceName, candidateName) {
  const sourceTokens = new Set(tokenize(sourceName));
  const candidateTokens = new Set(tokenize(candidateName));
  let overlap = 0;
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }

  const sourceEquipment = sourceName.match(/\(([^)]+)\)/)?.[1];
  const equipmentBonus = sourceEquipment && normalize(candidateName).includes(normalize(sourceEquipment)) ? 2 : 0;
  return overlap + equipmentBonus;
}

export function getCandidates(sourceName, dataset, limit = 8) {
  return dataset
    .map((exercise) => ({
      sourceExerciseKey: exercise.id,
      name: exercise.name,
      equipment: exercise.equipment,
      score: scoreCandidate(sourceName, exercise.name),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, limit);
}
