import Header from "@/components/Header";
import WorkoutDetails from "@/components/workouts/WorkoutDetails";
import { Id } from "@packages/backend/convex/_generated/dataModel";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="bg-[#F5F7FE] h-screen">
      <Header />
      <WorkoutDetails workoutId={slug as Id<"workouts">} />
    </main>
  );
}
