import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  bodyMeasurementUnitValidator,
  distanceUnitValidator,
  exerciseOriginValidator,
  exerciseVisibilityValidator,
  measurementImportMetadataValidator,
  measurementSourceTypeValidator,
  measurementTypeValidator,
  setGroupValidator,
  setPerformanceValidator,
  setPrescriptionValidator,
  setStatusValidator,
  setTypeValidator,
  weightUnitValidator,
  workoutExerciseImportMetadataValidator,
  workoutImportMetadataValidator,
  workoutOriginValidator,
  workoutSetImportMetadataValidator,
  workoutStatusValidator,
} from "./model";

export default defineSchema({
  programs: defineTable({
    userId: v.string(),
    name: v.string(),
    normalizedName: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    copiedFromProgramId: v.optional(v.id("programs")),
    archivedAt: v.optional(v.number()),
  })
    .index("by_userId_and_normalizedName", ["userId", "normalizedName"])
    .index("by_userId_and_archivedAt", ["userId", "archivedAt"]),

  exercises: defineTable({
    ownerUserId: v.optional(v.string()),
    name: v.string(),
    normalizedName: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    origin: exerciseOriginValidator,
    visibility: exerciseVisibilityValidator,
    copiedFromExerciseId: v.optional(v.id("exercises")),
    archivedAt: v.optional(v.number()),
    defaultWeightUnit: v.optional(weightUnitValidator),
    defaultDistanceUnit: v.optional(distanceUnitValidator),
    equipment: v.optional(v.string()),
  })
    .index("by_normalizedName", ["normalizedName"])
    .index("by_ownerUserId_and_normalizedName", ["ownerUserId", "normalizedName"])
    .index("by_ownerUserId_and_archivedAt", ["ownerUserId", "archivedAt"]),

  exerciseAliases: defineTable({
    exerciseId: v.id("exercises"),
    alias: v.string(),
    normalizedAlias: v.string(),
  })
    .index("by_normalizedAlias", ["normalizedAlias"])
    .index("by_exerciseId_and_normalizedAlias", ["exerciseId", "normalizedAlias"]),

  workoutTemplates: defineTable({
    userId: v.string(),
    programId: v.optional(v.id("programs")),
    name: v.string(),
    normalizedName: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    copiedFromTemplateId: v.optional(v.id("workoutTemplates")),
    archivedAt: v.optional(v.number()),
  })
    .index("by_userId_and_normalizedName", ["userId", "normalizedName"])
    .index("by_userId_and_archivedAt", ["userId", "archivedAt"])
    .index("by_programId_and_archivedAt", ["programId", "archivedAt"]),

  templateExercises: defineTable({
    templateId: v.id("workoutTemplates"),
    order: v.number(),
    exerciseId: v.id("exercises"),
    exerciseNameSnapshot: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_templateId_and_order", ["templateId", "order"])
    .index("by_templateId_and_exerciseId", ["templateId", "exerciseId"]),

  templateSets: defineTable({
    templateExerciseId: v.id("templateExercises"),
    setGroup: setGroupValidator,
    setNumber: v.number(),
    setType: setTypeValidator,
    prescription: setPrescriptionValidator,
    notes: v.optional(v.string()),
  }).index("by_templateExerciseId_and_setGroup_and_setNumber", [
    "templateExerciseId",
    "setGroup",
    "setNumber",
  ]),

  workouts: defineTable({
    userId: v.string(),
    status: workoutStatusValidator,
    origin: workoutOriginValidator,
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    name: v.string(),
    normalizedName: v.string(),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    basedOnTemplateId: v.optional(v.id("workoutTemplates")),
    basedOnTemplateNameSnapshot: v.optional(v.string()),
    basedOnProgramId: v.optional(v.id("programs")),
    basedOnProgramNameSnapshot: v.optional(v.string()),
    importMetadata: v.optional(workoutImportMetadataValidator),
  })
    .index("by_userId_and_startedAt", ["userId", "startedAt"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_completedAt", ["userId", "completedAt"])
    .index("by_userId_and_basedOnTemplateId", ["userId", "basedOnTemplateId"]),

  workoutExercises: defineTable({
    workoutId: v.id("workouts"),
    order: v.number(),
    exerciseId: v.optional(v.id("exercises")),
    exerciseNameSnapshot: v.string(),
    basedOnTemplateExerciseId: v.optional(v.id("templateExercises")),
    notes: v.optional(v.string()),
    importMetadata: v.optional(workoutExerciseImportMetadataValidator),
  })
    .index("by_workoutId_and_order", ["workoutId", "order"])
    .index("by_workoutId_and_exerciseId", ["workoutId", "exerciseId"]),

  workoutSets: defineTable({
    workoutExerciseId: v.id("workoutExercises"),
    basedOnTemplateSetId: v.optional(v.id("templateSets")),
    setGroup: setGroupValidator,
    setNumber: v.number(),
    setType: setTypeValidator,
    status: setStatusValidator,
    targetSnapshot: setPrescriptionValidator,
    actual: setPerformanceValidator,
    notes: v.optional(v.string()),
    importMetadata: v.optional(workoutSetImportMetadataValidator),
  })
    .index("by_workoutExerciseId_and_setGroup_and_setNumber", [
      "workoutExerciseId",
      "setGroup",
      "setNumber",
    ])
    .index("by_workoutExerciseId_and_status", ["workoutExerciseId", "status"]),

  measurements: defineTable({
    userId: v.string(),
    occurredAt: v.number(),
    type: measurementTypeValidator,
    valueCanonical: v.number(),
    canonicalUnit: v.union(
      weightUnitValidator,
      bodyMeasurementUnitValidator,
      v.literal("percent"),
    ),
    valueOriginal: v.optional(v.number()),
    originalUnit: v.optional(v.string()),
    sourceType: measurementSourceTypeValidator,
    sourceName: v.optional(v.string()),
    notes: v.optional(v.string()),
    importMetadata: v.optional(measurementImportMetadataValidator),
  })
    .index("by_userId_and_occurredAt", ["userId", "occurredAt"])
    .index("by_userId_and_type_and_occurredAt", ["userId", "type", "occurredAt"]),
});
