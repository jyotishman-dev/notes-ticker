import { prisma } from "@/lib/prisma";
import { TrackCard } from "@/components/track-card";
import { Card } from "@/components/ui/card";
import { AddTrackButton } from "@/components/add-track-button";
import { Layers, CheckCircle2, Clock, Flame } from "lucide-react";

export default async function DashboardPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { order: "asc" },
    include: {
      phases: {
        orderBy: { index: "asc" },
        include: { tasks: true },
      },
      sessions: true,
    },
  });

  const allTasks = tracks.flatMap((t) => t.phases.flatMap((p) => p.tasks));
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.completed).length;
  const totalSeconds = tracks.flatMap((t) => t.sessions).reduce((s, x) => s + x.durationSeconds, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const completedToday = allTasks.filter(
    (t) => t.completedAt && t.completedAt.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Command Center
          </div>
          <h1 className="mt-2 text-3xl font-bold">TrackForge</h1>
          <p className="mt-1 text-muted">
            Your learning gauntlet. {tracks.length} track{tracks.length === 1 ? "" : "s"} in pursuit.
          </p>
        </div>
        <AddTrackButton />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<Layers className="h-3.5 w-3.5" />} label="Active Tracks" value={String(tracks.length)} />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Tasks Done"
          value={`${doneTasks}/${totalTasks}`}
        />
        <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Total Time" value={`${hours}h ${minutes}m`} />
        <StatCard icon={<Flame className="h-3.5 w-3.5" />} label="Today" value={`${completedToday} done`} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {tracks.map((track) => {
          const tasks = track.phases.flatMap((p) => p.tasks);
          return (
            <TrackCard
              key={track.id}
              id={track.id}
              name={track.name}
              category={track.category}
              color={track.color}
              firstPhaseTitle={track.phases[0] ? `Phase ${track.phases[0].index}: ${track.phases[0].title}` : undefined}
              totalTasks={tasks.length}
              doneTasks={tasks.filter((t) => t.completed).length}
              completedDates={tasks.filter((t) => t.completedAt).map((t) => t.completedAt as Date)}
            />
          );
        })}

        {tracks.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted">
            No tracks yet. Run <code className="text-zinc-300">pnpm db:seed</code> to add a sample track.
          </Card>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
