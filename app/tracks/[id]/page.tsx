import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrackWorkspace } from "@/components/track-workspace";

export const revalidate = 0; // Disable caching so database updates are fresh

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
    },
  });

  if (!track) notFound();

  return <TrackWorkspace initialTrack={track} />;
}
