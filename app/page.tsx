import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard-client";

export const revalidate = 0;

export default async function DashboardPage() {
  const tracks = await prisma.track.findMany({
    orderBy: [{ pinned: "desc" }, { order: "asc" }],
    include: {
      phases: {
        include: { tasks: true },
      },
      notesList: true,
    },
  });

  // Compute per-track stats
  const tracksWithStats = tracks.map((t) => {
    const allTasks = t.phases.flatMap((p) => p.tasks);
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.completed).length;
    const notesCount = (t.notes && t.notes.trim() ? 1 : 0) + t.notesList.length;
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      color: t.color,
      pinned: t.pinned,
      totalTasks,
      doneTasks,
      notesCount,
    };
  });

  const totalNotesCount = tracksWithStats.reduce((s, t) => s + t.notesCount, 0);
  const totalTasks = tracksWithStats.reduce((s, t) => s + t.totalTasks, 0);
  const doneTasks = tracksWithStats.reduce((s, t) => s + t.doneTasks, 0);

  return (
    <DashboardClient
      tracks={tracksWithStats}
      totalNotes={totalNotesCount}
      totalTasks={totalTasks}
      doneTasks={doneTasks}
    />
  );
}
