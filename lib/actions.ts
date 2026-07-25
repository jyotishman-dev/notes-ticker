"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleTask(taskId: string, completed: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath("/", "layout");
}

export async function updateTaskNotes(taskId: string, notes: string | null) {
  await prisma.task.update({
    where: { id: taskId },
    data: { notes },
  });
  revalidatePath("/", "layout");
}

export async function updateTaskContent(taskId: string, content: string) {
  if (!content.trim()) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { content: content.trim() },
  });
  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({
    where: { id: taskId },
  });
  revalidatePath("/", "layout");
}

export async function addTask(phaseId: string, content: string) {
  if (!content.trim()) return;
  const last = await prisma.task.findFirst({
    where: { phaseId },
    orderBy: { order: "desc" },
  });
  const task = await prisma.task.create({
    data: { phaseId, content: content.trim(), order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/", "layout");
  return task;
}

export async function addPhase(trackId: string, title: string, concept?: string) {
  if (!title.trim()) return;
  const last = await prisma.phase.findFirst({
    where: { trackId },
    orderBy: { index: "desc" },
  });
  const phase = await prisma.phase.create({
    data: {
      trackId,
      title: title.trim(),
      concept: concept?.trim() || null,
      index: (last?.index ?? -1) + 1,
    },
  });
  revalidatePath("/", "layout");
  return phase;
}

export async function updatePhase(phaseId: string, title: string, concept?: string) {
  if (!title.trim()) return;
  await prisma.phase.update({
    where: { id: phaseId },
    data: {
      title: title.trim(),
      concept: concept?.trim() || null,
    },
  });
  revalidatePath("/", "layout");
}

export async function deletePhase(phaseId: string) {
  await prisma.phase.delete({
    where: { id: phaseId },
  });
  revalidatePath("/", "layout");
}

export async function updateTrackNotes(trackId: string, notes: string | null) {
  await prisma.track.update({
    where: { id: trackId },
    data: { notes },
  });
  revalidatePath("/", "layout");
}

export async function updateTrack(trackId: string, name: string, category: string, color: string) {
  if (!name.trim()) return;
  await prisma.track.update({
    where: { id: trackId },
    data: {
      name: name.trim(),
      category: category.trim() || "General",
      color,
    },
  });
  revalidatePath("/", "layout");
}

export async function createTrack(name: string, category: string, color: string) {
  if (!name.trim()) return;
  const last = await prisma.track.findFirst({ orderBy: { order: "desc" } });
  const track = await prisma.track.create({
    data: {
      name: name.trim(),
      category: category.trim() || "General",
      color,
      order: (last?.order ?? -1) + 1,
      phases: {
        create: [{ index: 0, title: "Setup", concept: "Kick things off." }],
      },
    },
  });
  revalidatePath("/", "layout");
  return track.id;
}
