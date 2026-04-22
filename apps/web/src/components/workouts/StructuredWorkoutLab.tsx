"use client";

import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

type SetDraft = {
  weightValue?: string;
  reps?: string;
  rpe?: string;
  notes?: string;
};

const demoTemplateName = "Demo Strength A";

function setKey(id: string) {
  return id;
}

function inputClassName() {
  return "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black/30";
}

function formatWorkoutStatus(status?: string) {
  return (status ?? "legacy").replace("_", " ");
}

export default function StructuredWorkoutLab() {
  const exercises = useQuery(api.exercises.list) ?? [];
  const templates = useQuery(api.templates.list) ?? [];
  const recentWorkouts = useQuery(api.sessions.listRecent) ?? [];

  const seedDemoExercises = useMutation(api.exercises.seedDemoExercises);
  const createTemplate = useMutation(api.templates.create);
  const startWorkout = useMutation(api.templates.startWorkout);
  const updateSet = useMutation(api.sessions.updateSet);
  const completeWorkout = useMutation(api.sessions.completeWorkout);

  const [isSeeding, setIsSeeding] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isStartingWorkout, setIsStartingWorkout] = useState<string | null>(null);
  const [isCompletingWorkout, setIsCompletingWorkout] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<Id<"workouts"> | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.normalizedName, exercise])),
    [exercises],
  );

  const activeWorkoutId =
    selectedWorkoutId ??
    recentWorkouts.find((workout) => workout.status === "in_progress")?._id ??
    recentWorkouts[0]?._id ??
    null;

  const selectedWorkout = useQuery(
    api.sessions.get,
    activeWorkoutId ? { workoutId: activeWorkoutId } : "skip",
  );

  const demoTemplate = templates.find((template) => template.normalizedName === "demo strength a");

  const handleSeedExercises = async () => {
    setIsSeeding(true);
    try {
      await seedDemoExercises({});
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateDemoTemplate = async () => {
    const bench = exerciseMap.get("bench press");
    const pullUp = exerciseMap.get("pull up");
    const rdl = exerciseMap.get("romanian deadlift");
    if (!bench || !pullUp || !rdl) {
      return;
    }

    setIsCreatingTemplate(true);
    try {
      await createTemplate({
        name: demoTemplateName,
        description: "Simple seeded template for validating the structured workout flow.",
        notes: "Created from the temporary web test bench.",
        exercises: [
          {
            exerciseId: bench._id,
            notes: "Flat pressing slot.",
            sets: [
              {
                setGroup: "work",
                setNumber: 1,
                setType: "normal",
                prescription: {
                  weightGrams: 100000,
                  weightValue: 100,
                  weightUnit: "kg",
                  reps: { min: 5, max: 5 },
                  rpe: 8,
                },
              },
              {
                setGroup: "work",
                setNumber: 2,
                setType: "normal",
                prescription: {
                  weightGrams: 100000,
                  weightValue: 100,
                  weightUnit: "kg",
                  reps: { min: 5, max: 5 },
                  rpe: 8,
                },
              },
              {
                setGroup: "work",
                setNumber: 3,
                setType: "normal",
                prescription: {
                  weightGrams: 100000,
                  weightValue: 100,
                  weightUnit: "kg",
                  reps: { min: 5, max: 5 },
                  rpe: 9,
                },
              },
            ],
          },
          {
            exerciseId: pullUp._id,
            notes: "Vertical pull slot.",
            sets: [
              {
                setGroup: "work",
                setNumber: 1,
                setType: "normal",
                prescription: {
                  reps: { min: 8, max: 8 },
                  rpe: 8,
                },
              },
              {
                setGroup: "work",
                setNumber: 2,
                setType: "normal",
                prescription: {
                  reps: { min: 8, max: 8 },
                  rpe: 8,
                },
              },
              {
                setGroup: "work",
                setNumber: 3,
                setType: "normal",
                prescription: {
                  reps: { min: 8, max: 8 },
                  rpe: 9,
                },
              },
            ],
          },
          {
            exerciseId: rdl._id,
            notes: "Hip hinge slot.",
            sets: [
              {
                setGroup: "work",
                setNumber: 1,
                setType: "normal",
                prescription: {
                  weightGrams: 120000,
                  weightValue: 120,
                  weightUnit: "kg",
                  reps: { min: 6, max: 6 },
                  rpe: 7,
                },
              },
              {
                setGroup: "work",
                setNumber: 2,
                setType: "normal",
                prescription: {
                  weightGrams: 120000,
                  weightValue: 120,
                  weightUnit: "kg",
                  reps: { min: 6, max: 6 },
                  rpe: 8,
                },
              },
            ],
          },
        ],
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleStartWorkout = async (templateId: Id<"workoutTemplates">) => {
    setIsStartingWorkout(templateId);
    try {
      const workoutId = await startWorkout({ templateId });
      setSelectedWorkoutId(workoutId);
    } finally {
      setIsStartingWorkout(null);
    }
  };

  const handleSaveSet = async (workoutSetId: Id<"workoutSets">) => {
    const draft = drafts[setKey(workoutSetId)] ?? {};
    const weightValue = draft.weightValue?.trim() ? Number(draft.weightValue) : undefined;
    const reps = draft.reps?.trim() ? Number(draft.reps) : undefined;
    const rpe = draft.rpe?.trim() ? Number(draft.rpe) : undefined;

    await updateSet({
      workoutSetId,
      status: "completed",
      actual: {
        weightValue,
        weightUnit: weightValue !== undefined ? "kg" : undefined,
        weightGrams: weightValue !== undefined ? weightValue * 1000 : undefined,
        reps,
        rpe,
      },
      notes: draft.notes,
    });
  };

  const handleSkipSet = async (workoutSetId: Id<"workoutSets">) => {
    await updateSet({
      workoutSetId,
      status: "skipped",
    });
  };

  const handleCompleteWorkout = async () => {
    if (!selectedWorkout?.workout._id) return;
    setIsCompletingWorkout(true);
    try {
      await completeWorkout({ workoutId: selectedWorkout.workout._id });
    } finally {
      setIsCompletingWorkout(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(235,236,239,0.95)_40%,_rgba(214,219,226,0.9))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
              Structured workout lab
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#151515] sm:text-5xl">
              Seed a few lifts. Build one template. Run the full workout loop.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-black/65 sm:text-base">
              This is a temporary test bench over the new data model. It lets you seed demo exercises,
              create a starter template, start a workout, enter set results, and watch template targets update on completion.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSeedExercises}
              disabled={isSeeding}
              className="rounded-full bg-[#161616] px-5 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSeeding ? "Seeding..." : "Seed 3 demo exercises"}
            </button>
            <button
              onClick={handleCreateDemoTemplate}
              disabled={isCreatingTemplate || !exerciseMap.get("bench press") || !exerciseMap.get("pull up") || !exerciseMap.get("romanian deadlift")}
              className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-medium text-black transition hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {demoTemplate ? "Create another demo template" : isCreatingTemplate ? "Creating..." : "Create demo template"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111]">Exercises</h2>
              <span className="text-xs uppercase tracking-[0.22em] text-black/40">{exercises.length}</span>
            </div>
            <div className="space-y-3">
              {exercises.length === 0 ? (
                <p className="text-sm text-black/55">No exercises yet. Seed the demo set first.</p>
              ) : (
                exercises.map((exercise) => (
                  <div key={exercise._id} className="rounded-2xl border border-black/8 bg-[#f8f8f8] px-4 py-3">
                    <div className="font-medium text-black">{exercise.name}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-black/40">
                      {exercise.equipment ?? "No equipment label"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111]">Templates</h2>
              <span className="text-xs uppercase tracking-[0.22em] text-black/40">{templates.length}</span>
            </div>
            <div className="space-y-3">
              {templates.length === 0 ? (
                <p className="text-sm text-black/55">Create the demo template to start testing.</p>
              ) : (
                templates.map((template) => (
                  <div key={template._id} className="rounded-2xl border border-black/8 bg-[#f8f8f8] px-4 py-4">
                    <div className="mb-1 font-medium text-black">{template.name}</div>
                    <p className="mb-4 text-sm leading-5 text-black/55">
                      {template.description ?? "No template description"}
                    </p>
                    <button
                      onClick={() => handleStartWorkout(template._id)}
                      disabled={isStartingWorkout === template._id}
                      className="rounded-full bg-[#222] px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isStartingWorkout === template._id ? "Starting..." : "Start workout"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111]">Recent workouts</h2>
              <span className="text-xs uppercase tracking-[0.22em] text-black/40">{recentWorkouts.length}</span>
            </div>
            <div className="space-y-3">
              {recentWorkouts.length === 0 ? (
                <p className="text-sm text-black/55">No workouts yet.</p>
              ) : (
                recentWorkouts.map((workout) => (
                  <button
                    key={workout._id}
                    onClick={() => setSelectedWorkoutId(workout._id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      activeWorkoutId === workout._id
                        ? "border-black/30 bg-black text-white"
                        : "border-black/8 bg-[#f8f8f8] text-black hover:border-black/20"
                    }`}
                  >
                    <div className="font-medium">{workout.name}</div>
                    <div className={`text-xs uppercase tracking-[0.22em] ${activeWorkoutId === workout._id ? "text-white/65" : "text-black/40"}`}>
                      {formatWorkoutStatus(workout.status)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          {!selectedWorkout ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-dashed border-black/15 bg-[#fafafa] p-8 text-center text-black/55">
              Start a workout from a template to test the structured session flow.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-black/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/40">
                    {formatWorkoutStatus(selectedWorkout.workout.status)}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#111] sm:text-4xl">
                    {selectedWorkout.workout.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
                    {selectedWorkout.workout.description ?? selectedWorkout.workout.notes ?? "No workout notes yet."}
                  </p>
                </div>
                {selectedWorkout.workout.status === "in_progress" ? (
                  <button
                    onClick={handleCompleteWorkout}
                    disabled={isCompletingWorkout}
                    className="rounded-full bg-[#111] px-5 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCompletingWorkout ? "Completing..." : "Complete workout"}
                  </button>
                ) : (
                  <div className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-black/45">
                    Historical session
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {selectedWorkout.exercises.map((exercise) => (
                  <div key={exercise._id} className="rounded-[24px] border border-black/10 bg-[#fbfbfb] p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-[#111]">{exercise.exerciseNameSnapshot}</h3>
                        <p className="text-sm text-black/50">{exercise.notes ?? "No exercise notes"}</p>
                      </div>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                        {exercise.sets.length} sets
                      </span>
                    </div>

                    <div className="space-y-3">
                      {exercise.sets.map((set) => {
                        const draft = drafts[setKey(set._id)] ?? {};
                        const currentWeight = draft.weightValue ?? (set.actual.weightValue?.toString() ?? "");
                        const currentReps = draft.reps ?? (set.actual.reps?.toString() ?? "");
                        const currentRpe = draft.rpe ?? (set.actual.rpe?.toString() ?? "");
                        const currentNotes = draft.notes ?? (set.notes ?? "");

                        return (
                          <div key={set._id} className="rounded-[20px] border border-black/8 bg-white p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-medium text-black">
                                  {set.setGroup} set #{set.setNumber}
                                </div>
                                <div className="text-sm text-black/55">
                                  Target: {set.targetSnapshot.weightValue ? `${set.targetSnapshot.weightValue} ${set.targetSnapshot.weightUnit}` : "—"}
                                  {set.targetSnapshot.reps ? ` · ${set.targetSnapshot.reps.min}-${set.targetSnapshot.reps.max} reps` : ""}
                                  {set.targetSnapshot.rpe ? ` · RPE ${set.targetSnapshot.rpe}` : ""}
                                </div>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                set.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : set.status === "skipped"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-black/5 text-black/45"
                              }`}>
                                {set.status}
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4">
                              <input
                                className={inputClassName()}
                                placeholder="Weight kg"
                                value={currentWeight}
                                onChange={(event) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [setKey(set._id)]: { ...prev[setKey(set._id)], weightValue: event.target.value },
                                  }))
                                }
                              />
                              <input
                                className={inputClassName()}
                                placeholder="Reps"
                                value={currentReps}
                                onChange={(event) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [setKey(set._id)]: { ...prev[setKey(set._id)], reps: event.target.value },
                                  }))
                                }
                              />
                              <input
                                className={inputClassName()}
                                placeholder="RPE"
                                value={currentRpe}
                                onChange={(event) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [setKey(set._id)]: { ...prev[setKey(set._id)], rpe: event.target.value },
                                  }))
                                }
                              />
                              <input
                                className={inputClassName()}
                                placeholder="Set note"
                                value={currentNotes}
                                onChange={(event) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [setKey(set._id)]: { ...prev[setKey(set._id)], notes: event.target.value },
                                  }))
                                }
                              />
                            </div>

                            {selectedWorkout.workout.status === "in_progress" ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleSaveSet(set._id)}
                                  className="rounded-full bg-[#111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                                >
                                  Save completed set
                                </button>
                                <button
                                  onClick={() => handleSkipSet(set._id)}
                                  className="rounded-full border border-black/12 px-4 py-2 text-sm font-medium text-black transition hover:border-black/25"
                                >
                                  Mark skipped
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
