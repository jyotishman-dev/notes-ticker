"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ---- Helper: ensure a track has at least one phase, returns its id ----
async function ensureDefaultPhase(trackId: string): Promise<string> {
  const existing = await prisma.phase.findFirst({
    where: { trackId },
    orderBy: { index: "asc" },
  });
  if (existing) return existing.id;
  const phase = await prisma.phase.create({
    data: { trackId, title: "Tasks", index: 0 },
  });
  return phase.id;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function toggleTask(taskId: string, completed: boolean) {
  await prisma.task.update({
    where: { id: taskId },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath("/", "layout");
}

export async function updateTaskNotes(taskId: string, notes: string | null) {
  await prisma.task.update({ where: { id: taskId }, data: { notes } });
  revalidatePath("/", "layout");
}

export async function updateTaskContent(taskId: string, content: string) {
  if (!content.trim()) return;
  await prisma.task.update({ where: { id: taskId }, data: { content: content.trim() } });
  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/", "layout");
}

export async function addTask(trackId: string, content: string) {
  if (!content.trim()) return;
  const phaseId = await ensureDefaultPhase(trackId);
  const last = await prisma.task.findFirst({ where: { phaseId }, orderBy: { order: "desc" } });
  const task = await prisma.task.create({
    data: { phaseId, content: content.trim(), order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/", "layout");
  return task;
}

// ─── Track ───────────────────────────────────────────────────────────────────

export async function updateTrackNotes(trackId: string, notes: string | null) {
  await prisma.track.update({ where: { id: trackId }, data: { notes } });
  revalidatePath("/", "layout");
}

export async function updateTrack(trackId: string, name: string, category: string, color: string) {
  if (!name.trim()) return;
  await prisma.track.update({
    where: { id: trackId },
    data: { name: name.trim(), category: category.trim() || "General", color },
  });
  revalidatePath("/", "layout");
}

export async function togglePin(trackId: string, pinned: boolean) {
  await prisma.track.update({ where: { id: trackId }, data: { pinned } });
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
      phases: { create: [{ index: 0, title: "Tasks" }] },
    },
  });
  revalidatePath("/", "layout");
  return track.id;
}

export async function deleteTrack(trackId: string) {
  await prisma.track.delete({ where: { id: trackId } });
  revalidatePath("/", "layout");
}

// ─── Note Folders ─────────────────────────────────────────────────────────────

export async function createNoteFolder(trackId: string, title: string) {
  if (!title.trim()) return;
  const last = await prisma.noteFolder.findFirst({ where: { trackId }, orderBy: { order: "desc" } });
  const folder = await prisma.noteFolder.create({
    data: { trackId, title: title.trim(), order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/", "layout");
  return folder;
}

export async function updateNoteFolder(folderId: string, title: string) {
  if (!title.trim()) return;
  await prisma.noteFolder.update({ where: { id: folderId }, data: { title: title.trim() } });
  revalidatePath("/", "layout");
}

export async function deleteNoteFolder(folderId: string) {
  // Notes inside will have folderId set to null (onDelete: SetNull)
  await prisma.noteFolder.delete({ where: { id: folderId } });
  revalidatePath("/", "layout");
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function addNote(trackId: string, title: string, folderId?: string | null, content: string = "") {
  if (!title.trim()) return;
  const last = await prisma.note.findFirst({
    where: folderId ? { folderId } : { trackId, folderId: null },
    orderBy: { order: "desc" },
  });
  const note = await prisma.note.create({
    data: {
      trackId,
      folderId: folderId ?? null,
      title: title.trim(),
      content,
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath("/", "layout");
  return note;
}

export async function updateNoteTitle(noteId: string, title: string) {
  if (!title.trim()) return;
  await prisma.note.update({ where: { id: noteId }, data: { title: title.trim() } });
  revalidatePath("/", "layout");
}

export async function updateNoteContent(noteId: string, content: string | null) {
  await prisma.note.update({ where: { id: noteId }, data: { content: content || "" } });
  revalidatePath("/", "layout");
}

export async function moveNoteToFolder(noteId: string, folderId: string | null) {
  await prisma.note.update({ where: { id: noteId }, data: { folderId } });
  revalidatePath("/", "layout");
}

export async function deleteNote(noteId: string) {
  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath("/", "layout");
}
