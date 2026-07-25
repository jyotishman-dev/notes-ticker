import { prisma } from "@/lib/prisma";
import { TrackCard } from "@/components/track-card";
import { Card } from "@/components/ui/card";
import { AddTrackButton } from "@/components/add-track-button";
import { Layers, CheckCircle2, FileText, Sparkles } from "lucide-react";

export default async function DashboardPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { order: "asc" },
    include: {
      phases: {
        orderBy: { index: "asc" },
        include: { tasks: true },
      },
    },
  });

  const allTasks = tracks.flatMap((t) => t.phases.flatMap((p) => p.tasks));
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.completed).length;

  // Calculate note statistics
  const trackNotesCount = tracks.filter((t) => t.notes && t.notes.trim()).length;
  const taskNotesCount = allTasks.filter((t) => t.notes && t.notes.trim()).length;
  const totalNotes = trackNotesCount + taskNotesCount;

  const averageCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Knowledge base
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">TrackForge Notes</h1>
          <p className="mt-1 text-sm text-muted">
            High-speed gauntlet documentation & checklist workspace.
          </p>
        </div>
        <AddTrackButton />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<Layers className="h-3.5 w-3.5 text-emerald-400" />} label="Active Gauntlets" value={String(tracks.length)} />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />}
          label="Milestones Done"
          value={`${doneTasks}/${totalTasks}`}
        />
        <StatCard icon={<FileText className="h-3.5 w-3.5 text-amber-400" />} label="Total Notes" value={String(totalNotes)} />
        <StatCard icon={<Sparkles className="h-3.5 w-3.5 text-pink-400" />} label="Completion Rate" value={`${averageCompletion}%`} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {tracks.map((track) => {
          const tasks = track.phases.flatMap((p) => p.tasks);
          const notesCount = (track.notes && track.notes.trim() ? 1 : 0) + tasks.filter((t) => t.notes && t.notes.trim()).length;
          return (
            <TrackCard
              key={track.id}
              id={track.id}
              name={track.name}
              category={track.category}
              color={track.color}
              firstPhaseTitle={track.phases[0] ? `${track.phases[0].title}` : undefined}
              totalTasks={tasks.length}
              doneTasks={tasks.filter((t) => t.completed).length}
              notesCount={notesCount}
            />
          );
        })}

        {tracks.length === 0 && (
          <Card className="col-span-full p-8 text-center text-muted border-dashed border-border bg-panel/20">
            No active gauntlets found. Click the button above to start a new learning gauntlet track.
          </Card>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 bg-panel/40 border-border/80">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </Card>
  );
}
