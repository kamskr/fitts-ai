"use client";

import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

interface NoteDetailsProps {
  workoutId: Id<"workouts">;
}

function formatWorkoutStatus(status?: string) {
  return (status ?? "legacy").replace("_", " ");
}

const WorkoutDetails = ({ workoutId }: NoteDetailsProps) => {
  const currentWorkout = useQuery(api.sessions.get, { workoutId });

  if (currentWorkout === undefined) {
    return <div className="container px-6 py-16 text-black/60">Loading workout...</div>;
  }

  if (!currentWorkout) {
    return <div className="container px-6 py-16 text-black/60">Workout not found.</div>;
  }

  return (
    <div className="container space-y-6 py-16 px-6 sm:px-0">
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/40">
          {formatWorkoutStatus(currentWorkout.workout.status)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-black sm:text-5xl">
          {currentWorkout.workout.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/60 sm:text-base">
          {currentWorkout.workout.description ?? currentWorkout.workout.notes ?? "No workout notes."}
        </p>
      </div>

      <div className="space-y-4">
        {currentWorkout.exercises.map((exercise) => (
          <div key={exercise._id} className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-black">{exercise.exerciseNameSnapshot}</h2>
            <p className="mt-1 text-sm text-black/55">{exercise.notes ?? "No exercise notes"}</p>
            <div className="mt-4 space-y-3">
              {exercise.sets.map((set) => (
                <div key={set._id} className="rounded-2xl border border-black/8 bg-[#fafafa] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-black">
                      {set.setGroup} set #{set.setNumber}
                    </div>
                    <div className="text-xs uppercase tracking-[0.22em] text-black/45">{set.status}</div>
                  </div>
                  <div className="mt-2 text-sm text-black/60">
                    Target: {set.targetSnapshot.weightValue ? `${set.targetSnapshot.weightValue} ${set.targetSnapshot.weightUnit}` : "—"}
                    {set.targetSnapshot.reps ? ` · ${set.targetSnapshot.reps.min}-${set.targetSnapshot.reps.max} reps` : ""}
                    {set.targetSnapshot.rpe ? ` · RPE ${set.targetSnapshot.rpe}` : ""}
                  </div>
                  <div className="mt-1 text-sm text-black/70">
                    Actual: {set.actual.weightValue ? `${set.actual.weightValue} ${set.actual.weightUnit}` : "—"}
                    {set.actual.reps !== undefined ? ` · ${set.actual.reps} reps` : ""}
                    {set.actual.rpe !== undefined ? ` · RPE ${set.actual.rpe}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutDetails;
