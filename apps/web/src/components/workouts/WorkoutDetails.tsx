"use client";

import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import ComplexToggle from "../home/ComplexToggle";
import { useState } from "react";

interface NoteDetailsProps {
  workoutId: Id<"workouts">;
}

const WorkoutDetails = ({ workoutId }: NoteDetailsProps) => {
  const [isSummary, setIsSummary] = useState(false);
  const currentWorkout = useQuery(api.workouts.getWorkout, { id: workoutId });

  return (
    <div className="container space-y-6 sm:space-y-9 py-20 px-[26px] sm:px-0">
      <div className="flex justify-center items-center">
        <ComplexToggle isSummary={isSummary} setIsSummary={setIsSummary} />
      </div>
      <h3 className="text-black text-center pb-5 text-xl sm:text-[32px] not-italic font-semibold leading-[90.3%] tracking-[-0.8px]">
        {currentWorkout?.title}
      </h3>
      <p className="text-black text-xl sm:text-[28px] not-italic font-normal leading-[130.3%] tracking-[-0.7px]">
        {!isSummary
          ? currentWorkout?.content
          : currentWorkout?.summary
            ? currentWorkout?.summary
            : "No AI recap available"}
      </p>
    </div>
  );
};

export default WorkoutDetails;
