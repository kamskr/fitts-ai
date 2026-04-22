import Header from "@/components/Header";
import Workouts from "@/components/workouts/Workouts";

export default function Home() {
  return (
    <main className="bg-[#EDEDED] h-screen">
      <Header />
      <Workouts />
    </main>
  );
}
