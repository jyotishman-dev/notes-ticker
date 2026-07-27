import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrackWorkspace } from "@/components/track-workspace";

export const revalidate = 0;

export default async function TrackPage({
  params,
}: {
  params: { id: string };
}) {
  const track = await prisma.track.findUnique({
    where: { id: params.id },
    include: {
      phases: {
        orderBy: { index: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
      noteFolders: {
        orderBy: { order: "asc" },
        include: {
          notes: { orderBy: { order: "asc" } },
        },
      },
      notesList: {
        where: { folderId: null }, // only unfiled notes
        orderBy: { order: "asc" },
      },
    },
  });

  if (!track) notFound();

  return <TrackWorkspace initialTrack={track} />;
}
