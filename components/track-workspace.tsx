"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  FileText,
  Flame,
  Clock,
  NotebookPen,
  Plus,
  Trash2,
  Edit3,
  Expand,
  Shrink,
  Search,
  Check,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  FileEdit,
  PlusCircle,
  X,
  Settings,
  Download,
  ClipboardList,
  Command,
  History,
  RotateCcw,
  FileClock,
  Folder,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import {
  toggleTask,
  updateTaskNotes,
  updateTaskContent,
  deleteTask,
  addTask,
  updateTrackNotes,
  updateTrack,
  deleteTrack,
  addNote,
  updateNoteTitle,
  updateNoteContent,
  deleteNote,
  togglePin,
  createNoteFolder,
  updateNoteFolder,
  deleteNoteFolder,
  moveNoteToFolder,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

// Models matching database schema
interface ClientTask {
  id: string;
  phaseId: string;
  content: string;
  notes: string | null;
  completed: boolean;
  completedAt: Date | null;
  order: number;
}

interface ClientPhase {
  id: string;
  trackId: string;
  index: number;
  title: string;
  concept: string | null;
  tasks: ClientTask[];
}

interface ClientNote {
  id: string;
  trackId: string;
  folderId: string | null;
  title: string;
  content: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ClientNoteFolder {
  id: string;
  trackId: string;
  title: string;
  order: number;
  notes: ClientNote[];
}

interface ClientTrack {
  id: string;
  name: string;
  category: string;
  color: string;
  notes: string | null;
  phases: ClientPhase[];
  notesList: ClientNote[];     // unfiled notes
  noteFolders: ClientNoteFolder[];
}

const COLOR_THEMES: Record<string, { dot: string; bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/20"
  },
  amber: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/20"
  },
  cyan: {
    dot: "bg-cyan-400",
    bg: "bg-cyan-400/10",
    text: "text-cyan-400",
    border: "border-cyan-400/20",
    glow: "shadow-cyan-400/20"
  },
  pink: {
    dot: "bg-pink-500",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/20",
    glow: "shadow-pink-500/20"
  },
  violet: {
    dot: "bg-violet-500",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/20"
  }
};

const NOTE_TEMPLATES = [
  {
    name: "Learning Log",
    icon: Sparkles,
    content: `# Learning Log: [Topic Name]

## Core Concept
Explain the main concept in your own words.

## Key Learnings
- **Concept 1:** Brief description
- **Concept 2:** Brief description

## Code / Snippets
\`\`\`javascript
// Write your code snippet here
console.log("Learning TrackForge!");
\`\`\`

## References & Resources
- [Reference Title](https://example.com)
`
  },
  {
    name: "Technical Spec",
    icon: FileText,
    content: `# Technical Specification: [Feature Name]

## Objective
What are we building and why?

## Architecture
- Outline of the database changes, APIs, or components.

## Tasks & Checklist
- [ ] Task 1
- [ ] Task 2

## Open Questions / Risks
- What details are still outstanding?
`
  },
  {
    name: "Daily Progress Journal",
    icon: NotebookPen,
    content: `# Daily Progress Log

**Date:** ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## Tasks Completed
- Completed task details here.

## Blockers / Challenges
- What did you get stuck on? How did you resolve it?

## Next Steps
- What will you tackle tomorrow?
`
  }
];

const getSearchSnippet = (text: string | null, query: string): string | null => {
  if (!text || !query) return null;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return null;

  // Extract surrounding context
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + query.length + 25);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
};

export function TrackWorkspace({ initialTrack }: { initialTrack: any }) {
  const router = useRouter();
  // 1. Client State
  const [track, setTrack] = useState<ClientTrack>(initialTrack);
  const [activeNote, setActiveNote] = useState<{ type: "track" | "task" | "custom"; id: string }>({
    type: "track",
    id: initialTrack.id
  });

  // Active note content state
  const [editorText, setEditorText] = useState("");
  
  // UI states
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "split">("split");
  const [focusMode, setFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  // New Note states
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [addingNoteToFolderId, setAddingNoteToFolderId] = useState<string | null>(null); // null = unfiled

  // Folder states
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(initialTrack.noteFolders?.map((f: any) => f.id) ?? [])
  );
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderTitle, setRenameFolderTitle] = useState("");

  // Track settings states
  const [trackSettingsName, setTrackSettingsName] = useState(track.name);
  const [trackSettingsCategory, setTrackSettingsCategory] = useState(track.category);
  const [trackSettingsColor, setTrackSettingsColor] = useState(track.color);

  // Command Palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Version History state: Record<noteKey, Array<{timestamp, content}>>
  // noteKey = "track" | noteId | taskId
  const [versionHistory, setVersionHistory] = useState<Record<string, Array<{ timestamp: Date; content: string; label: string }>>>({}); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);

  // Transitions
  const [, startTransition] = useTransition();

  // Ref for debounced note saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const theme = COLOR_THEMES[track.color] || COLOR_THEMES.emerald;

  // 2. Synchronize active note text whenever active note selection changes
  useEffect(() => {
    if (activeNote.type === "track") {
      setEditorText(track.notes || "");
    } else if (activeNote.type === "custom") {
      // Search unfiled notes first
      const unfiled = track.notesList?.find((n) => n.id === activeNote.id);
      if (unfiled) {
        setEditorText(unfiled.content);
      } else {
        // Search inside folders
        let found = "";
        for (const folder of (track.noteFolders || [])) {
          const n = folder.notes.find((n) => n.id === activeNote.id);
          if (n) { found = n.content; break; }
        }
        setEditorText(found);
      }
    } else {
      let foundNotes = "";
      for (const phase of track.phases) {
         const task = phase.tasks.find((t) => t.id === activeNote.id);
         if (task) { foundNotes = task.notes || ""; break; }
      }
      setEditorText(foundNotes);
    }
    setSaveStatus("saved");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [activeNote, track.id]);

  // Save note immediately without debounce
  const saveCurrentNote = async (type: "track" | "task" | "custom", id: string, val: string) => {
    try {
      if (type === "track") {
        await updateTrackNotes(id, val || null);
      } else if (type === "custom") {
        await updateNoteContent(id, val);
      } else {
        await updateTaskNotes(id, val || null);
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to save notes:", err);
      setSaveStatus("error");
    }
  };

  const handleSelectNote = async (type: "track" | "task" | "custom", id: string) => {
    if (activeNote.type === type && activeNote.id === id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      setSaveStatus("saving");
      // Save the note we are leaving
      await saveCurrentNote(activeNote.type, activeNote.id, editorText);
    }

    setActiveNote({ type, id });
  };

  // 3. Debounced Auto-Saving function
  const handleEditorChange = (val: string) => {
    setEditorText(val);
    setSaveStatus("saving");

    // Update local state instantly so switching notes or searching sees the latest text
    if (activeNote.type === "track") {
      setTrack((prev) => ({ ...prev, notes: val }));
    } else if (activeNote.type === "custom") {
      setTrack((prev) => {
        // Check unfiled notes
        const inUnfiled = prev.notesList.some((n) => n.id === activeNote.id);
        if (inUnfiled) {
          return { ...prev, notesList: prev.notesList.map((n) => (n.id === activeNote.id ? { ...n, content: val } : n)) };
        }
        // Check folder notes
        return {
          ...prev,
          noteFolders: (prev.noteFolders || []).map((f) => ({
            ...f,
            notes: f.notes.map((n) => (n.id === activeNote.id ? { ...n, content: val } : n)),
          })),
        };
      });
    } else {
      setTrack((prev) => {
        const nextPhases = prev.phases.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === activeNote.id ? { ...t, notes: val } : t))
        }));
        return { ...prev, phases: nextPhases };
      });
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (activeNote.type === "track") {
          await updateTrackNotes(track.id, val || null);
          captureVersionSnapshot(track.id, val, "General Notes");
        } else if (activeNote.type === "custom") {
          await updateNoteContent(activeNote.id, val);
          // Label: search unfiled then folders
          const unfiledNote = track.notesList?.find(n => n.id === activeNote.id);
          let noteLabel = unfiledNote?.title;
          if (!noteLabel) {
            for (const f of (track.noteFolders || [])) {
              const n = f.notes.find(n => n.id === activeNote.id);
              if (n) { noteLabel = `${f.title} / ${n.title}`; break; }
            }
          }
          captureVersionSnapshot(activeNote.id, val, noteLabel || "Document");
        } else {
          await updateTaskNotes(activeNote.id, val || null);
          let taskLabel = "Task Notes";
          for (const p of track.phases) {
            const t = p.tasks.find(t => t.id === activeNote.id);
            if (t) { taskLabel = t.content; break; }
          }
          captureVersionSnapshot(activeNote.id, val, taskLabel);
        }
        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to save notes:", err);
        setSaveStatus("error");
      }
    }, 600);
  };

  // Capture a version snapshot when note is saved
  const captureVersionSnapshot = (noteKey: string, content: string, label: string) => {
    if (!content.trim()) return;
    setVersionHistory((prev) => {
      const existing = prev[noteKey] || [];
      // Don't duplicate identical consecutive snapshots
      if (existing.length > 0 && existing[existing.length - 1].content === content) return prev;
      const newSnapshots = [...existing, { timestamp: new Date(), content, label }];
      // Keep max 30 snapshots per note
      return { ...prev, [noteKey]: newSnapshots.slice(-30) };
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Global keyboard listener for Command Palette (Ctrl/Cmd+P)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        setCommandQuery("");
      }
      if (e.key === "Escape") {
        setShowCommandPalette(false);
        setShowHistoryModal(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Focus command input when palette opens
  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => commandInputRef.current?.focus(), 50);
    }
  }, [showCommandPalette]);

  // 4. Action Handlers (all with instant optimistic updates)

  // Toggle Task Completion
  const handleToggleTask = (taskId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: newVal, completedAt: newVal ? new Date() : null } : t
        )
      }))
    }));

    // Server update
    startTransition(async () => {
      await toggleTask(taskId, newVal);
    });
  };

  // Add Task directly under the track (phase is transparent)
  const handleAddTask = async (content: string) => {
    if (!content.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const defaultPhaseId = track.phases[0]?.id ?? "temp-phase";

    const newTaskObj: ClientTask = {
      id: tempId,
      phaseId: defaultPhaseId,
      content: content.trim(),
      notes: "",
      completed: false,
      completedAt: null,
      order: 999
    };

    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.length > 0
        ? prev.phases.map((p, i) => i === 0 ? { ...p, tasks: [...p.tasks, newTaskObj] } : p)
        : [{ id: defaultPhaseId, trackId: prev.id, index: 0, title: "Tasks", concept: null, tasks: [newTaskObj] }]
    }));

    try {
      const createdTask = await addTask(track.id, content);
      if (createdTask) {
        setTrack((prev) => ({
          ...prev,
          phases: prev.phases.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) => (t.id === tempId ? { ...t, id: createdTask.id, phaseId: createdTask.phaseId } : t))
          }))
        }));
        setActiveNote((curr) => (curr.id === tempId ? { ...curr, id: createdTask.id } : curr));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete a Task
  const handleDeleteTask = (taskId: string) => {
    // If the active note is this task, switch back to track general notes
    if (activeNote.type === "task" && activeNote.id === taskId) {
      setActiveNote({ type: "track", id: track.id });
    }

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.map((p) => ({
        ...p,
        tasks: p.tasks.filter((t) => t.id !== taskId)
      }))
    }));

    // Server update
    startTransition(async () => {
      await deleteTask(taskId);
    });
  };

  // Edit Task Title Content
  const handleEditTaskContent = (taskId: string, newContent: string) => {
    if (!newContent.trim()) return;

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, content: newContent.trim() } : t))
      }))
    }));

    // Server update
    startTransition(async () => {
      await updateTaskContent(taskId, newContent);
    });
  };

  // Pin/unpin this track
  const handleTogglePin = () => {
    startTransition(async () => {
      await togglePin(track.id, !(track as any).pinned);
    });
  };

  // Save Track Settings
  const handleSaveTrackSettings = () => {
    if (!trackSettingsName.trim()) return;

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      name: trackSettingsName.trim(),
      category: trackSettingsCategory.trim() || "General",
      color: trackSettingsColor
    }));

    setShowSettings(false);

    // Server update
    startTransition(async () => {
      await updateTrack(track.id, trackSettingsName, trackSettingsCategory, trackSettingsColor);
    });
  };

  const handleDeleteTrack = () => {
    if (confirm(`Are you sure you want to permanently delete "${track.name}"? This action cannot be undone and will delete all phases, tasks, and notes.`)) {
      setShowSettings(false);
      startTransition(async () => {
        await deleteTrack(track.id);
        router.push("/");
      });
    }
  };

  // Note handlers
  const handleAddNote = async (folderId: string | null = null) => {
    if (!newNoteTitle.trim()) return;
    const tempId = `temp-note-${Date.now()}`;
    const newNoteObj: ClientNote = {
      id: tempId,
      trackId: track.id,
      folderId,
      title: newNoteTitle.trim(),
      content: "",
      order: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (folderId) {
      // Add inside a folder
      setTrack((prev) => ({
        ...prev,
        noteFolders: (prev.noteFolders || []).map((f) =>
          f.id === folderId ? { ...f, notes: [...f.notes, newNoteObj] } : f
        ),
      }));
    } else {
      // Add as unfiled
      setTrack((prev) => ({ ...prev, notesList: [...(prev.notesList || []), newNoteObj] }));
    }

    setIsAddingNote(false);
    setAddingNoteToFolderId(null);
    setNewNoteTitle("");

    try {
      const createdNote = await addNote(track.id, newNoteObj.title, folderId);
      if (createdNote) {
        if (folderId) {
          setTrack((prev) => ({
            ...prev,
            noteFolders: (prev.noteFolders || []).map((f) =>
              f.id === folderId
                ? { ...f, notes: f.notes.map((n) => (n.id === tempId ? { ...n, id: createdNote.id } : n)) }
                : f
            ),
          }));
        } else {
          setTrack((prev) => ({
            ...prev,
            notesList: (prev.notesList || []).map((n) => (n.id === tempId ? { ...n, id: createdNote.id } : n)),
          }));
        }
        setActiveNote({ type: "custom", id: createdNote.id });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = (noteId: string, folderId: string | null = null) => {
    if (activeNote.type === "custom" && activeNote.id === noteId) {
      setActiveNote({ type: "track", id: track.id });
    }
    if (folderId) {
      setTrack((prev) => ({
        ...prev,
        noteFolders: (prev.noteFolders || []).map((f) =>
          f.id === folderId ? { ...f, notes: f.notes.filter((n) => n.id !== noteId) } : f
        ),
      }));
    } else {
      setTrack((prev) => ({ ...prev, notesList: (prev.notesList || []).filter((n) => n.id !== noteId) }));
    }
    startTransition(async () => { await deleteNote(noteId); });
  };

  const handleRenameNote = (noteId: string, newTitle: string, folderId: string | null = null) => {
    if (!newTitle.trim()) return;
    const updater = (notes: ClientNote[]) =>
      notes.map((n) => (n.id === noteId ? { ...n, title: newTitle.trim() } : n));
    if (folderId) {
      setTrack((prev) => ({
        ...prev,
        noteFolders: (prev.noteFolders || []).map((f) =>
          f.id === folderId ? { ...f, notes: updater(f.notes) } : f
        ),
      }));
    } else {
      setTrack((prev) => ({ ...prev, notesList: updater(prev.notesList || []) }));
    }
    startTransition(async () => { await updateNoteTitle(noteId, newTitle); });
  };

  // ── Folder handlers ─────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderTitle.trim()) return;
    const tempId = `temp-folder-${Date.now()}`;
    const newFolder: ClientNoteFolder = {
      id: tempId,
      trackId: track.id,
      title: newFolderTitle.trim(),
      order: (track.noteFolders?.length ?? 0),
      notes: [],
    };
    setTrack((prev) => ({ ...prev, noteFolders: [...(prev.noteFolders || []), newFolder] }));
    setExpandedFolders((prev) => new Set([...prev, tempId]));
    setIsAddingFolder(false);
    setNewFolderTitle("");
    try {
      const created = await createNoteFolder(track.id, newFolder.title);
      if (created) {
        setTrack((prev) => ({
          ...prev,
          noteFolders: (prev.noteFolders || []).map((f) => (f.id === tempId ? { ...f, id: created.id } : f)),
        }));
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          next.add(created.id);
          return next;
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!confirm("Delete this folder? Notes inside will become unfiled.")) return;
    const folder = track.noteFolders?.find((f) => f.id === folderId);
    const unfiledNotes = folder?.notes ?? [];
    setTrack((prev) => ({
      ...prev,
      noteFolders: (prev.noteFolders || []).filter((f) => f.id !== folderId),
      notesList: [
        ...(prev.notesList || []),
        ...unfiledNotes.map((n) => ({ ...n, folderId: null })),
      ],
    }));
    if (activeNote.type === "custom" && unfiledNotes.some((n) => n.id === activeNote.id)) {
      // note is now unfiled — still accessible
    }
    startTransition(async () => { await deleteNoteFolder(folderId); });
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renameFolderTitle.trim()) { setRenamingFolderId(null); return; }
    setTrack((prev) => ({
      ...prev,
      noteFolders: (prev.noteFolders || []).map((f) =>
        f.id === folderId ? { ...f, title: renameFolderTitle.trim() } : f
      ),
    }));
    setRenamingFolderId(null);
    startTransition(async () => { await updateNoteFolder(folderId, renameFolderTitle); });
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };



  // Export & Extractor functions
  const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
  const [showExtractorModal, setShowExtractorModal] = useState(false);
  const [extractorTargetPhaseId, setExtractorTargetPhaseId] = useState("");
  const [selectedExtractedTasks, setSelectedExtractedTasks] = useState<Record<number, boolean>>({});

  const handleExportMarkdown = () => {
    if (!editorText) return;
    const blob = new Blob([editorText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `${track.name}_${activeNoteTitle.replace(/\s+/g, "_")}.md`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenExtractor = () => {
    if (!editorText.trim()) {
      alert("Write some notes with task lists first! The extractor looks for lines starting with '- [ ]', '- ', '* ', or numbers.");
      return;
    }

    const lines = editorText.split("\n");
    const tasksFound: string[] = [];
    for (const line of lines) {
      const checkMatch = line.match(/^(\s*[-*+]\s\[[ ]\])\s*(.*)/);
      const listMatch = line.match(/^(\s*[-*+])\s*(?!\[[ xX]\])(.*)/);
      const numMatch = line.match(/^(\s*\d+\.)\s*(.*)/);

      if (checkMatch && checkMatch[2].trim()) {
        tasksFound.push(checkMatch[2].trim());
      } else if (listMatch && listMatch[2].trim()) {
        tasksFound.push(listMatch[2].trim());
      } else if (numMatch && numMatch[2].trim()) {
        tasksFound.push(numMatch[2].trim());
      }
    }

    if (tasksFound.length === 0) {
      alert("No checklist or list items found. Try '- [ ] Task 1' or '- Task 2'.");
      return;
    }

    setExtractedTasks(tasksFound);
    const initialSelection: Record<number, boolean> = {};
    tasksFound.forEach((_, idx) => { initialSelection[idx] = true; });
    setSelectedExtractedTasks(initialSelection);
    // extractorTargetPhaseId is unused now — handleImportExtractedTasks uses track.id
    setShowExtractorModal(true);
  };

  const handleImportExtractedTasks = async () => {
    const tasksToImport = extractedTasks.filter((_, idx) => selectedExtractedTasks[idx]);
    if (tasksToImport.length === 0) {
      alert("No tasks selected.");
      return;
    }
    for (const taskContent of tasksToImport) {
      await handleAddTask(taskContent);
    }
    setShowExtractorModal(false);
  };

  // 5. Text insertion helper (for markdown toolbar and templates)
  const insertTextAtCursor = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    handleEditorChange(newValue);

    // Refocus and place cursor appropriately
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMeta = e.ctrlKey || e.metaKey;

    if (isMeta) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        insertTextAtCursor("**", "**");
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        insertTextAtCursor("*", "*");
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        insertTextAtCursor("`", "`");
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        setSaveStatus("saving");
        saveCurrentNote(activeNote.type, activeNote.id, editorText);
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        insertTextAtCursor("[", "](url)");
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      insertTextAtCursor("  ", "");
    }

    if (e.key === "Enter") {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const text = textarea.value;
      const lastNewline = text.lastIndexOf("\n", start - 1);
      const currentLine = text.substring(lastNewline + 1, start);

      const checkMatch = currentLine.match(/^(\s*[-*+]\s\[[ xX]\])\s(.*)/);
      const bulletMatch = currentLine.match(/^(\s*[-*+])\s(.*)/);
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)/);

      if (checkMatch) {
        if (!checkMatch[2].trim()) {
          e.preventDefault();
          const beforeLine = text.substring(0, lastNewline + 1);
          const afterLine = text.substring(start);
          handleEditorChange(beforeLine + afterLine);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lastNewline + 1, lastNewline + 1);
          }, 10);
        } else {
          e.preventDefault();
          insertTextAtCursor("\n- [ ] ", "");
        }
      } else if (bulletMatch) {
        if (!bulletMatch[2].trim()) {
          e.preventDefault();
          const beforeLine = text.substring(0, lastNewline + 1);
          const afterLine = text.substring(start);
          handleEditorChange(beforeLine + afterLine);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lastNewline + 1, lastNewline + 1);
          }, 10);
        } else {
          e.preventDefault();
          insertTextAtCursor(`\n${bulletMatch[1]} `, "");
        }
      } else if (orderedMatch) {
        if (!orderedMatch[3].trim()) {
          e.preventDefault();
          const beforeLine = text.substring(0, lastNewline + 1);
          const afterLine = text.substring(start);
          handleEditorChange(beforeLine + afterLine);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lastNewline + 1, lastNewline + 1);
          }, 10);
        } else {
          e.preventDefault();
          const nextNum = parseInt(orderedMatch[2], 10) + 1;
          insertTextAtCursor(`\n${orderedMatch[1]}${nextNum}. `, "");
        }
      }
    }
  };

  const applyTemplate = (templateContent: string) => {
    if (editorText && !confirm("Do you want to append this template to your current note?")) {
      return;
    }
    const newText = editorText ? `${editorText}\n\n${templateContent}` : templateContent;
    handleEditorChange(newText);
  };

  // 6. Navigation items
  const activeNoteTitle = activeNote.type === "track"
    ? "General Notes"
    : activeNote.type === "custom"
    ? (() => {
        // Search unfiled notes first
        const unfiled = (track.notesList || []).find((x) => x.id === activeNote.id);
        if (unfiled) return unfiled.title;
        // Search in folders
        for (const folder of (track.noteFolders || [])) {
          const n = folder.notes.find((x) => x.id === activeNote.id);
          if (n) return n.title;
        }
        return "Notes";
      })()
    : (() => {
        for (const phase of track.phases) {
          const t = phase.tasks.find((t) => t.id === activeNote.id);
          if (t) return t.content;
        }
        return "Notes";
      })();

  const activeNoteParent = activeNote.type === "task"
    ? "Task Notes"
    : activeNote.type === "custom"
    ? "Documents & Logs"
    : "";

  // Statistics
  const allTasks = track.phases.flatMap((p) => p.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.completed).length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  
  const notesCount = (track.notes ? 1 : 0) + 
    (track.notesList ? track.notesList.length : 0) + 
    allTasks.filter((t) => t.notes).length;

  // Filtered sidebar structure for search
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const hasSearchMatches = searchQuery.length > 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base text-zinc-100 font-sans">
      {/* SIDEBAR */}
      <aside
        className={cn(
          "w-80 shrink-0 border-r border-border bg-[#0d0d10] flex flex-col transition-all duration-300",
          focusMode ? "-ml-80" : "ml-0"
        )}
      >
        {/* Track Title / Navigation Header */}
        <div className="px-4 py-4 border-b border-border flex flex-col gap-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-zinc-300 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 truncate">
              <span className={cn("h-3 w-3 rounded-full shrink-0 shadow-lg", theme.dot)} />
              <span className="font-bold text-lg truncate tracking-tight">{track.name}</span>
            </div>
            <button
              onClick={() => {
                setTrackSettingsName(track.name);
                setTrackSettingsCategory(track.category);
                setTrackSettingsColor(track.color);
                setShowSettings(true);
              }}
              className="p-1.5 hover:bg-panel border border-transparent hover:border-border text-muted hover:text-zinc-200 rounded-lg transition-all"
              title="Gauntlet Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted">
            <span>{track.category}</span>
            <span>{completionPct}% Complete</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-panel h-1.5 rounded-full overflow-hidden border border-border/30 mt-1">
            <div
              className={cn("h-full transition-all duration-500", theme.dot)}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* Search & Statistics summary */}
        <div className="px-3 py-2 border-b border-border bg-[#0a0a0c]/50 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search notes & tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-panel text-xs text-zinc-200 placeholder:text-muted focus:border-zinc-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 p-0.5 text-muted hover:text-zinc-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Notes & Tasks Navigation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
          
          {/* Section: General Notes */}
          {!hasSearchMatches || matchesSearch(track.name) || matchesSearch(track.notes || "") ? (
            <div>
              <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-muted">Workspace</div>
              <button
                onClick={() => handleSelectNote("track", track.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-all",
                  activeNote.type === "track"
                    ? "bg-panel text-zinc-100 border border-border"
                    : "text-muted hover:bg-panel/40 hover:text-zinc-200 border border-transparent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={cn("h-4 w-4 shrink-0", activeNote.type === "track" ? theme.text : "text-muted")} />
                    <span className="truncate font-medium">General Overview Notes</span>
                  </div>
                  {hasSearchMatches && getSearchSnippet(track.notes, searchQuery) && (
                    <div className="text-[10px] text-amber-400/80 font-mono mt-1 pl-6 truncate">
                      matched: "{getSearchSnippet(track.notes, searchQuery)}"
                    </div>
                  )}
                </div>
                {track.notes && (
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 ml-2", theme.dot)} />
                )}
              </button>
            </div>
          ) : null}

          {/* Section: Documents & Folders */}
          <div>
            {/* Header row */}
            <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
              <span>Documents & Logs</span>
              <div className="flex items-center gap-1">
                {/* New Folder */}
                <button
                  onClick={() => { setIsAddingFolder(true); setIsAddingNote(false); }}
                  className="hover:text-zinc-200 transition-colors flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-border bg-[#0a0a0c]"
                  title="New folder"
                >
                  <FolderPlus className="h-2.5 w-2.5" />
                  Folder
                </button>
                {/* New unfiled note */}
                <button
                  onClick={() => { setIsAddingNote(true); setAddingNoteToFolderId(null); setIsAddingFolder(false); }}
                  className="hover:text-zinc-200 transition-colors flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-border bg-[#0a0a0c]"
                  title="New document"
                >
                  <Plus className="h-2.5 w-2.5" />
                  Note
                </button>
              </div>
            </div>

            {/* New Folder inline input */}
            {isAddingFolder && (
              <div className="mb-2 p-2 rounded-lg border border-border bg-panel space-y-1.5">
                <input
                  type="text"
                  placeholder="Folder name (e.g. Promises & Async)"
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") { setIsAddingFolder(false); setNewFolderTitle(""); }
                  }}
                  className="w-full px-2 py-1 rounded bg-base text-xs border border-border focus:border-zinc-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1 text-[9px]">
                  <button onClick={() => { setIsAddingFolder(false); setNewFolderTitle(""); }} className="px-2 py-0.5 text-muted hover:text-zinc-200">Cancel</button>
                  <button onClick={handleCreateFolder} disabled={!newFolderTitle.trim()} className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium">Create</button>
                </div>
              </div>
            )}

            {/* Unfiled note inline input */}
            {isAddingNote && addingNoteToFolderId === null && (
              <div className="mb-2 p-2 rounded-lg border border-border bg-panel space-y-1.5">
                <input
                  type="text"
                  placeholder="Document title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddNote(null);
                    if (e.key === "Escape") { setIsAddingNote(false); setNewNoteTitle(""); }
                  }}
                  className="w-full px-2 py-1 rounded bg-base text-xs border border-border focus:border-zinc-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1 text-[9px]">
                  <button onClick={() => { setIsAddingNote(false); setNewNoteTitle(""); }} className="px-2 py-0.5 text-muted hover:text-zinc-200">Cancel</button>
                  <button onClick={() => handleAddNote(null)} disabled={!newNoteTitle.trim()} className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium">Create</button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {/* ── Folders ─────────────────────────────────────────────── */}
              {(track.noteFolders || []).map((folder) => {
                const isExpanded = expandedFolders.has(folder.id);
                const isRenaming = renamingFolderId === folder.id;
                const folderMatches =
                  matchesSearch(folder.title) ||
                  folder.notes.some((n) => matchesSearch(n.title) || matchesSearch(n.content));
                if (hasSearchMatches && !folderMatches) return null;

                return (
                  <div key={folder.id}>
                    {/* Folder row */}
                    <div className="flex items-center group/folder px-1 py-1 rounded-md hover:bg-panel/40 transition-all">
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleFolderExpanded(folder.id)}
                        className="shrink-0 p-0.5 text-muted hover:text-zinc-200"
                      >
                        <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
                      </button>

                      {/* Folder icon & name */}
                      <button
                        onClick={() => toggleFolderExpanded(folder.id)}
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                      >
                        {isExpanded
                          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                          : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/60" />
                        }
                        {isRenaming ? (
                          <input
                            type="text"
                            value={renameFolderTitle}
                            onChange={(e) => setRenameFolderTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameFolder(folder.id);
                              if (e.key === "Escape") setRenamingFolderId(null);
                            }}
                            onBlur={() => handleRenameFolder(folder.id)}
                            className="flex-1 bg-panel border border-border rounded px-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-xs font-medium text-zinc-300 truncate">{folder.title}</span>
                        )}
                      </button>

                      {/* Note count badge */}
                      <span className="text-[9px] font-mono text-muted/60 shrink-0 mr-1">
                        {folder.notes.length}
                      </span>

                      {/* Folder actions */}
                      <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                        {/* Add note inside folder */}
                        <button
                          onClick={() => {
                            setAddingNoteToFolderId(folder.id);
                            setIsAddingNote(true);
                            setIsAddingFolder(false);
                            if (!isExpanded) toggleFolderExpanded(folder.id);
                          }}
                          className="p-0.5 text-muted hover:text-zinc-200 rounded"
                          title="Add note to folder"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { setRenamingFolderId(folder.id); setRenameFolderTitle(folder.title); }}
                          className="p-0.5 text-muted hover:text-zinc-200 rounded"
                          title="Rename folder"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="p-0.5 text-muted hover:text-red-400 rounded"
                          title="Delete folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Inline add note inside folder */}
                    {isAddingNote && addingNoteToFolderId === folder.id && (
                      <div className="ml-5 mr-1 mb-1 p-2 rounded-lg border border-border bg-panel space-y-1.5">
                        <input
                          type="text"
                          placeholder="Note title..."
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddNote(folder.id);
                            if (e.key === "Escape") { setIsAddingNote(false); setNewNoteTitle(""); }
                          }}
                          className="w-full px-2 py-1 rounded bg-base text-xs border border-border focus:border-zinc-500 focus:outline-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1 text-[9px]">
                          <button onClick={() => { setIsAddingNote(false); setNewNoteTitle(""); }} className="px-2 py-0.5 text-muted hover:text-zinc-200">Cancel</button>
                          <button onClick={() => handleAddNote(folder.id)} disabled={!newNoteTitle.trim()} className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium">Add</button>
                        </div>
                      </div>
                    )}

                    {/* Notes inside folder */}
                    {isExpanded && (
                      <div className="ml-5 space-y-0.5 mt-0.5">
                        {folder.notes.length === 0 && !(isAddingNote && addingNoteToFolderId === folder.id) && (
                          <div className="text-[10px] text-muted/50 italic px-2 py-1">Empty folder</div>
                        )}
                        {folder.notes.map((note) => {
                          const noteMatches = matchesSearch(note.title) || matchesSearch(note.content);
                          if (hasSearchMatches && !noteMatches) return null;
                          const isSelected = activeNote.type === "custom" && activeNote.id === note.id;
                          return (
                            <div key={note.id} className={cn(
                              "flex items-center justify-between group/note pl-2 pr-1 py-1 rounded-md text-xs transition-all",
                              isSelected
                                ? "bg-panel border border-border text-zinc-100 font-medium"
                                : "text-muted hover:bg-panel/30 hover:text-zinc-200 border border-transparent"
                            )}>
                              <button
                                onClick={() => handleSelectNote("custom", note.id)}
                                className="truncate text-left flex-1 py-0.5 flex items-center gap-2 min-w-0"
                              >
                                <FileText className={cn("h-3 w-3 shrink-0", isSelected ? theme.text : "text-muted/60")} />
                                <span className="truncate">{note.title}</span>
                              </button>
                              <div className="opacity-0 group-hover/note:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                                <button
                                  onClick={() => { const t = prompt("Rename:", note.title); if (t) handleRenameNote(note.id, t, folder.id); }}
                                  className="p-0.5 text-muted hover:text-zinc-200 rounded"
                                ><Edit3 className="h-2.5 w-2.5" /></button>
                                <button
                                  onClick={() => { if (confirm(`Delete "${note.title}"?`)) handleDeleteNote(note.id, folder.id); }}
                                  className="p-0.5 text-muted hover:text-red-400 rounded"
                                ><Trash2 className="h-2.5 w-2.5" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Unfiled Notes ─────────────────────────────────────── */}
              {(track.notesList || []).map((note) => {
                const noteMatches = matchesSearch(note.title) || matchesSearch(note.content);
                if (hasSearchMatches && !noteMatches) return null;
                const isSelected = activeNote.type === "custom" && activeNote.id === note.id;
                return (
                  <div key={note.id} className={cn(
                    "flex items-center justify-between group/note pl-2 pr-1 py-1.5 rounded-md text-xs transition-all",
                    isSelected
                      ? "bg-panel border border-border text-zinc-100 font-medium"
                      : "text-muted hover:bg-panel/30 hover:text-zinc-200 border border-transparent"
                  )}>
                    <button
                      onClick={() => handleSelectNote("custom", note.id)}
                      className="truncate text-left flex-1 py-0.5 flex items-center gap-2 min-w-0"
                    >
                      <NotebookPen className={cn("h-3.5 w-3.5 shrink-0", isSelected ? theme.text : "text-muted")} />
                      <span className="truncate block flex-1">{note.title}</span>
                    </button>
                    <div className="opacity-0 group-hover/note:opacity-100 flex items-center transition-opacity shrink-0">
                      <button
                        onClick={() => { const t = prompt("Rename:", note.title); if (t) handleRenameNote(note.id, t, null); }}
                        className="p-1 text-muted hover:text-zinc-200 rounded"
                      ><Edit3 className="h-3 w-3" /></button>
                      <button
                        onClick={() => { if (confirm(`Delete "${note.title}"?`)) handleDeleteNote(note.id, null); }}
                        className="p-1 text-muted hover:text-red-400 rounded"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {(track.noteFolders || []).length === 0 && (track.notesList || []).length === 0 && !isAddingNote && !isAddingFolder && (
                <div className="text-[10px] text-muted/50 italic text-center py-3 px-2">
                  No documents yet. Create a folder or add a note.
                </div>
              )}
            </div>
          </div>

          {/* Section: Tasks Checklist (flat — no phases exposed) */}
          <div>
            <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
              <span>Checklist</span>
              <span>
                {allTasks.filter(t => t.completed).length}/{allTasks.length} done
              </span>
            </div>

            <div className="mt-1.5 space-y-0.5">
              {allTasks.map((task) => {
                const taskMatches =
                  matchesSearch(task.content) ||
                  (task.notes && matchesSearch(task.notes));

                if (hasSearchMatches && !taskMatches) return null;

                const isSelected = activeNote.type === "task" && activeNote.id === task.id;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between group/task pl-2 pr-1 py-1.5 rounded-md text-xs transition-all",
                      isSelected
                        ? "bg-panel border border-border text-zinc-100 font-medium"
                        : "text-muted hover:bg-panel/30 hover:text-zinc-200 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleTask(task.id, task.completed)}
                        className="focus:outline-none shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </button>

                      <button
                        onClick={() => handleSelectNote("task", task.id)}
                        className={cn(
                          "truncate text-left flex-1 py-0.5",
                          task.completed && "line-through text-muted/60"
                        )}
                      >
                        <span className="block truncate">{task.content}</span>
                        {hasSearchMatches && getSearchSnippet(task.notes, searchQuery) && (
                          <span className="block text-[10px] text-amber-400/80 font-mono mt-0.5 truncate font-normal">
                            matched: &ldquo;{getSearchSnippet(task.notes, searchQuery)}&rdquo;
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {task.notes && (
                        <span className={cn("text-[9px] px-1 rounded font-mono border", theme.text, theme.border)}>
                          Note
                        </span>
                      )}
                      <div className="opacity-0 group-hover/task:opacity-100 flex items-center transition-opacity">
                        <button
                          onClick={() => {
                            const nextName = prompt("Rename task:", task.content);
                            if (nextName) handleEditTaskContent(task.id, nextName);
                          }}
                          className="p-1 text-muted hover:text-zinc-200 rounded"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-muted hover:text-red-400 rounded"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {allTasks.length === 0 && !hasSearchMatches && (
                <div className="text-[10px] text-muted/50 italic text-center py-3 px-2">
                  No tasks yet. Add one below.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Add Task */}
        <div className="p-3 border-t border-border bg-[#0a0a0c]/80">
          <AddTaskInline onAdd={(content) => handleAddTask(content)} />
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-base relative">
        {/* Toggle Sidebar Button (in Focus Mode) */}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            className="absolute left-4 top-4 z-50 p-2 bg-panel/85 hover:bg-panel border border-border text-muted hover:text-zinc-200 rounded-lg shadow-lg flex items-center gap-1 text-xs backdrop-blur-md transition-all"
          >
            <Shrink className="h-3.5 w-3.5" />
            Show Sidebar
          </button>
        )}

        {/* WORKSPACE HEADER */}
        <header className={cn("px-6 py-4 border-b border-border flex items-center justify-between bg-[#0d0d10]/90 backdrop-blur-md", focusMode && "pl-28")}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted font-mono uppercase tracking-wider">
              {activeNote.type === "track" ? (
                <>
                  <BookOpen className="h-3.5 w-3.5 text-muted" />
                  <span>Gauntlet Workspace</span>
                </>
              ) : (
                <>
                  <FileEdit className="h-3.5 w-3.5 text-muted" />
                  <span className="truncate">{activeNoteParent}</span>
                </>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-zinc-100 mt-0.5 truncate tracking-tight">
              {activeNoteTitle}
            </h2>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Auto-save status indicator */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-muted">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-400 font-medium">Error saving!</span>
              )}
            </div>

            {/* Task Extractor, Export, History & Command Palette */}
            <div className="flex items-center gap-1.5">
              {/* Command Palette button */}
              <button
                onClick={() => { setShowCommandPalette(true); setCommandQuery(""); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-panel/60 hover:bg-panel border border-border text-muted hover:text-zinc-200 rounded-lg text-xs font-mono transition-all shadow-sm"
                title="Command Palette (Ctrl+P)"
              >
                <Command className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[10px]">Ctrl+P</span>
              </button>

              {/* Version History button */}
              <button
                onClick={() => { setShowHistoryModal(true); setSelectedHistoryIdx(null); }}
                className="p-2 border border-border rounded-lg bg-panel hover:bg-zinc-800 text-muted hover:text-zinc-200 transition-colors"
                title="View note version history"
              >
                <FileClock className="h-4 w-4" />
              </button>

              <button
                onClick={handleOpenExtractor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-all shadow-sm"
                title="Extract checklist items from your markdown note"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Extract Tasks</span>
              </button>
              <button
                onClick={handleExportMarkdown}
                disabled={!editorText}
                className="p-2 border border-border rounded-lg bg-panel hover:bg-zinc-800 text-muted hover:text-zinc-200 transition-colors disabled:opacity-40"
                title="Export as Markdown (.md)"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            {/* Split / Edit / Preview Tabs */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-[#0a0a0c]">
              <button
                onClick={() => setEditorMode("edit")}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors",
                  editorMode === "edit" ? "bg-panel text-zinc-100 font-medium" : "text-muted hover:text-zinc-200"
                )}
              >
                Write
              </button>
              <button
                onClick={() => setEditorMode("preview")}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors",
                  editorMode === "preview" ? "bg-panel text-zinc-100 font-medium" : "text-muted hover:text-zinc-200"
                )}
              >
                Preview
              </button>
              <button
                onClick={() => setEditorMode("split")}
                className={cn(
                  "hidden md:block px-3 py-1 text-xs rounded-md transition-colors",
                  editorMode === "split" ? "bg-panel text-zinc-100 font-medium" : "text-muted hover:text-zinc-200"
                )}
              >
                Split
              </button>
            </div>

            {/* Focus Mode toggle */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className="p-2 border border-border rounded-lg bg-panel hover:bg-zinc-800 text-muted hover:text-zinc-200 transition-colors"
              title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
            >
              {focusMode ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* THE EDITOR PANE */}
          {editorMode !== "preview" && (
            <div className="flex-1 flex flex-col h-full bg-[#08080a] border-r border-border">
              {/* Markdown Toolbar */}
              <div className="px-4 py-2 border-b border-border bg-[#0d0d10] flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-0.5 shrink-0">
                  <ToolbarButton onClick={() => insertTextAtCursor("**", "**")} label="Bold" tooltip="Ctrl+B">
                    <span className="font-bold text-xs">B</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("*", "*")} label="Italic" tooltip="Ctrl+I">
                    <span className="italic text-xs">I</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("`", "`")} label="Inline Code" tooltip="Ctrl+E">
                    <span className="font-mono text-xs text-amber-400">`c`</span>
                  </ToolbarButton>
                  <span className="h-4 w-[1px] bg-border mx-1" />
                  <ToolbarButton onClick={() => insertTextAtCursor("# ", "")} label="H1">
                    <span className="font-bold text-xs">H1</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("## ", "")} label="H2">
                    <span className="font-bold text-xs">H2</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("### ", "")} label="H3">
                    <span className="font-bold text-xs">H3</span>
                  </ToolbarButton>
                  <span className="h-4 w-[1px] bg-border mx-1" />
                  <ToolbarButton onClick={() => insertTextAtCursor("- ", "")} label="Bullet List">
                    <span className="text-xs">List</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("1. ", "")} label="Numbered List">
                    <span className="text-xs">1. List</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("- [ ] ", "")} label="Check List">
                    <span className="text-xs">[x] List</span>
                  </ToolbarButton>
                  <span className="h-4 w-[1px] bg-border mx-1" />
                  <ToolbarButton onClick={() => insertTextAtCursor("```javascript\n", "\n```")} label="Code Block">
                    <span className="font-mono text-xs">{"{ }"}</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("[", "](url)")} label="Link" tooltip="Ctrl+K">
                    <span className="text-xs underline text-emerald-400">Link</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("> ", "")} label="Quote">
                    <span className="text-xs italic font-serif">"Q"</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("\n| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n", "")} label="Table">
                    <span className="text-xs font-mono">Table</span>
                  </ToolbarButton>
                  <ToolbarButton onClick={() => insertTextAtCursor("\n---\n", "")} label="Divider">
                    <span className="text-xs">—</span>
                  </ToolbarButton>
                </div>

                {/* Templates Selector */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-muted uppercase">Templates</span>
                  <div className="flex items-center gap-1 bg-[#0a0a0c] p-0.5 rounded-md border border-border">
                    {NOTE_TEMPLATES.map((tmpl) => {
                      const Icon = tmpl.icon;
                      return (
                        <button
                          key={tmpl.name}
                          onClick={() => applyTemplate(tmpl.content)}
                          className="px-2 py-1 hover:bg-panel text-[10px] text-muted hover:text-zinc-200 rounded flex items-center gap-1 transition-colors"
                        >
                          <Icon className="h-3 w-3 text-emerald-400" />
                          <span>{tmpl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Textarea Editor Element */}
              <div className="flex-1 relative p-1 overflow-hidden">
                <textarea
                  ref={textareaRef}
                  value={editorText}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Write your ${activeNote.type === "track" ? "gauntlet overview" : "task"} notes here. Markdown syntax is supported. Notes are saved automatically.`}
                  className="w-full h-full resize-none bg-transparent px-6 py-4 text-sm text-zinc-200 placeholder:text-muted/50 focus:outline-none font-sans leading-relaxed custom-scrollbar overflow-y-auto"
                />
              </div>

              {/* Stats Bar */}
              <div className="px-6 py-2 border-t border-border bg-[#0d0d10] flex items-center justify-between text-[10px] font-mono text-muted">
                <div className="flex items-center gap-4">
                  <span>{editorText.length} characters</span>
                  <span>{editorText.split(/\s+/).filter(Boolean).length} words</span>
                  <span>{Math.max(1, Math.ceil(editorText.split(/\s+/).filter(Boolean).length / 200))} min read</span>
                </div>
                <div>
                  <span>Auto-saving enabled</span>
                </div>
              </div>
            </div>
          )}

          {/* THE PREVIEW PANE */}
          {editorMode !== "edit" && (
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-[#0a0a0c] p-8">
              <div className="max-w-2xl mx-auto prose prose-invert">
                <MarkdownPreview content={editorText} />
              </div>
            </div>
          )}

        </div>
      </main>


      {/* DIALOG: TRACK SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-zinc-100">Gauntlet Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-muted hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">Gauntlet Name</label>
                <input
                  type="text"
                  value={trackSettingsName}
                  onChange={(e) => setTrackSettingsName(e.target.value)}
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">Category</label>
                <input
                  type="text"
                  value={trackSettingsCategory}
                  onChange={(e) => setTrackSettingsCategory(e.target.value)}
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">Color Theme</label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {Object.keys(COLOR_THEMES).map((col) => {
                    const active = trackSettingsColor === col;
                    return (
                      <button
                        key={col}
                        onClick={() => setTrackSettingsColor(col)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-lg border text-xs capitalize transition-all",
                          active
                            ? "bg-panel border-zinc-500 text-zinc-100"
                            : "bg-base border-border text-muted hover:text-zinc-300 hover:border-zinc-700"
                        )}
                      >
                        <span className={cn("h-3 w-3 rounded-full mb-1", COLOR_THEMES[col].dot)} />
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2 text-xs">
              <button
                onClick={handleDeleteTrack}
                className="px-4 py-2 bg-red-950/45 hover:bg-red-900/60 border border-red-900/40 text-red-400 font-medium rounded-lg transition-colors"
              >
                Delete Gauntlet
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border border-border rounded-lg text-muted hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTrackSettings}
                  disabled={!trackSettingsName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: TASK EXTRACTOR MODAL */}
      {showExtractorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-border bg-panel p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-zinc-100">Extract Tasks from Notes</h3>
              </div>
              <button onClick={() => setShowExtractorModal(false)} className="text-muted hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted mt-2">
              We found the following list items in your note. Select which ones you want to import into your checklist and choose the target phase.
            </p>

            {/* List of found tasks */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-2 border border-border/60 bg-[#0a0a0c]/60 p-3 rounded-lg custom-scrollbar max-h-[40vh]">
              {extractedTasks.map((task, idx) => {
                const checked = selectedExtractedTasks[idx] ?? false;
                return (
                  <label
                    key={idx}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-all",
                      checked
                        ? "border-emerald-500/30 bg-emerald-500/5 text-zinc-100"
                        : "border-border bg-transparent text-muted hover:text-zinc-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedExtractedTasks((prev) => ({ ...prev, [idx]: e.target.checked }))
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 h-4 w-4 mt-0.5 shrink-0"
                    />
                    <span>{task}</span>
                  </label>
                );
              })}
            </div>

            {/* Tasks will be added directly to this gauntlet's checklist */}
            <div className="mt-4 text-[11px] text-muted bg-panel/60 border border-border rounded-lg px-3 py-2">
              Selected tasks will be added to this gauntlet&apos;s checklist.
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowExtractorModal(false)}
                className="px-4 py-2 border border-border rounded-lg text-muted hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportExtractedTasks}
                disabled={!Object.values(selectedExtractedTasks).some(Boolean)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Import selected items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE MODAL */}
      {showCommandPalette && (() => {
        const q = commandQuery.toLowerCase().trim();
        
        // Build searchable items
        const items: Array<{ type: string; id: string; label: string; sub: string; noteType: "track" | "task" | "custom" | null; noteId: string | null }> = [];
        
        // General Notes
        items.push({ type: "note", id: track.id, label: "General Overview Notes", sub: "Workspace", noteType: "track", noteId: track.id });
        
        // Custom Documents
        (track.notesList || []).forEach(n => {
          items.push({ type: "doc", id: n.id, label: n.title, sub: "Document", noteType: "custom", noteId: n.id });
        });

        // Tasks (flat, no phase grouping in palette)
        allTasks.forEach(task => {
          items.push({ type: "task", id: task.id, label: task.content, sub: "Checklist", noteType: "task", noteId: task.id });
        });

        const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)) : items;

        const typeIcon = (type: string) => {
          if (type === "note") return <FileText className="h-4 w-4 text-emerald-400" />;
          if (type === "doc") return <NotebookPen className="h-4 w-4 text-violet-400" />;
          return <Circle className="h-4 w-4 text-zinc-500" />;
        };

        return (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}
          >
            <div className="w-full max-w-lg bg-[#0d0d10] border border-border rounded-xl shadow-2xl overflow-hidden" style={{ boxShadow: '0 0 60px rgba(16,185,129,0.08), 0 25px 50px rgba(0,0,0,0.6)' }}>
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Search className="h-4 w-4 text-muted shrink-0" />
                <input
                  ref={commandInputRef}
                  type="text"
                  placeholder="Search notes, tasks, phases..."
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-muted/60 focus:outline-none"
                />
                <kbd className="text-[10px] text-muted/60 font-mono bg-panel/60 border border-border/60 px-1.5 py-0.5 rounded">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[380px] overflow-y-auto custom-scrollbar py-1.5">
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-muted text-sm">No results found</div>
                )}
                {filtered.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      if (item.noteType && item.noteId) {
                        handleSelectNote(item.noteType, item.noteId);
                      }
                      setShowCommandPalette(false);
                    }}
                    disabled={!item.noteType}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-panel/50 transition-colors text-left group disabled:opacity-50 disabled:cursor-default"
                  >
                    <span className="shrink-0">{typeIcon(item.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200 truncate group-hover:text-white">{item.label}</div>
                      <div className="text-[11px] text-muted font-mono truncate">{item.sub}</div>
                    </div>
                    {item.noteType && (
                      <span className="text-[10px] text-muted/50 font-mono shrink-0">Open →</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-border bg-[#0a0a0c]/80 flex items-center justify-between text-[10px] text-muted/50 font-mono">
                <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                <span>↑↓ navigate · Enter select · Esc close</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && (() => {
        const noteKey = activeNote.type === "track" ? track.id : activeNote.id;
        const snapshots = (versionHistory[noteKey] || []).slice().reverse();
        const previewIdx = selectedHistoryIdx !== null ? selectedHistoryIdx : null;
        const previewContent = previewIdx !== null ? snapshots[previewIdx]?.content ?? "" : "";

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-3xl h-[80vh] rounded-xl border border-border bg-[#0d0d10] shadow-2xl flex flex-col overflow-hidden" style={{ boxShadow: '0 0 60px rgba(124,58,237,0.08), 0 25px 50px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <FileClock className="h-5 w-5 text-violet-400" />
                  <h3 className="text-sm font-bold text-zinc-100">Version History</h3>
                  <span className="text-xs text-muted font-mono ml-1">— {activeNoteTitle}</span>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="text-muted hover:text-zinc-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 min-h-0">
                {/* Snapshot list */}
                <div className="w-52 shrink-0 border-r border-border overflow-y-auto custom-scrollbar bg-[#0a0a0c]/60">
                  {snapshots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                      <History className="h-8 w-8 text-muted/30 mb-3" />
                      <p className="text-xs text-muted">No snapshots yet.</p>
                      <p className="text-[10px] text-muted/50 mt-1">Snapshots are captured each time your note auto-saves.</p>
                    </div>
                  ) : (
                    <div className="py-1.5">
                      {snapshots.map((snap, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedHistoryIdx(idx)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors",
                            previewIdx === idx ? "bg-violet-500/10 border-l-2 border-l-violet-500" : "hover:bg-panel/40"
                          )}
                        >
                          <div className="text-xs font-medium text-zinc-300 truncate">
                            {idx === 0 ? "Latest" : `v${snapshots.length - idx}`}
                          </div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">
                            {snap.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-muted/60 mt-0.5">
                            {snap.content.split(/\s+/).filter(Boolean).length} words
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview pane */}
                <div className="flex-1 flex flex-col min-w-0">
                  {previewIdx === null ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted">
                      <RotateCcw className="h-8 w-8 text-muted/20 mb-3" />
                      <p className="text-sm">Select a snapshot to preview</p>
                      <p className="text-[11px] text-muted/50 mt-1 max-w-[240px]">You can restore any previous version of your note.</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-between bg-[#0a0a0c]/60">
                        <div className="text-[11px] font-mono text-muted">
                          Snapshot from {snapshots[previewIdx]?.timestamp.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Restore this version? Your current content will be replaced.")) {
                              handleEditorChange(previewContent);
                              setShowHistoryModal(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore this version
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">{previewContent}</pre>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Inline input for adding task rapidly — always visible in the sidebar footer
function AddTaskInline({ onAdd }: { onAdd: (content: string) => void }) {
  const [val, setVal] = useState("");

  const submit = () => {
    if (val.trim()) {
      onAdd(val.trim());
      setVal("");
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-panel/40 border border-border/60 hover:border-zinc-600 transition-colors">
      <Plus className="h-3.5 w-3.5 text-muted shrink-0" />
      <input
        type="text"
        placeholder="Add a task and press Enter..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setVal("");
        }}
        className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-muted/60 focus:outline-none"
      />
    </div>
  );
}

// Toolbar helper button
function ToolbarButton({
  onClick,
  children,
  label,
  tooltip
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 hover:bg-panel hover:text-zinc-100 text-muted rounded-md flex items-center justify-center min-w-[28px] h-[28px] transition-colors border border-transparent hover:border-border"
      title={`${label}${tooltip ? ` (${tooltip})` : ""}`}
    >
      {children}
    </button>
  );
}

// Renders the Markdown Preview beautifully
export function MarkdownPreview({ content }: { content: string }) {
  if (!content || !content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
        <NotebookPen className="h-10 w-10 text-muted/30 mb-3" />
        <p className="italic text-sm">No notes written yet.</p>
        <p className="text-xs text-muted/60 mt-1 max-w-[280px]">Select 'Write' tab above or choose a quick template in the toolbar to begin notes taking.</p>
      </div>
    );
  }

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";
  let inList = false;
  let listItems: string[] = [];
  let listType: "bullet" | "ordered" | "check" = "bullet";

  const flushList = (key: number) => {
    if (listItems.length === 0) return null;
    const items = [...listItems];
    const type = listType;
    listItems = [];
    inList = false;

    if (type === "check") {
      return (
        <ul key={`list-${key}`} className="space-y-1 my-3 pl-1">
          {items.map((item, idx) => {
            const checked = item.startsWith("[x]") || item.startsWith("[X]");
            const text = item.replace(/^\[[ xX]\]\s*/, "");
            return (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 h-4 w-4 mt-0.5 shrink-0"
                />
                <span className={cn(checked ? "line-through text-muted" : "text-zinc-200")}>
                  {renderInline(text)}
                </span>
              </li>
            );
          })}
        </ul>
      );
    } else if (type === "ordered") {
      return (
        <ol key={`list-${key}`} className="list-decimal pl-6 space-y-1.5 my-3 text-sm text-zinc-300">
          {items.map((item, idx) => (
            <li key={idx} className="text-zinc-200 pl-1">{renderInline(item)}</li>
          ))}
        </ol>
      );
    } else {
      return (
        <ul key={`list-${key}`} className="list-disc pl-6 space-y-1.5 my-3 text-sm text-zinc-300">
          {items.map((item, idx) => (
            <li key={idx} className="text-zinc-200 pl-1">{renderInline(item)}</li>
          ))}
        </ul>
      );
    }
  };

  const renderInline = (text: string): React.ReactNode[] => {
    let parts: React.ReactNode[] = [text];
    let keyIdx = 0;

    // 1. Bold: **text**
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      const regex = /\*\*(.*?)\*\*/g;
      const result = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index));
        }
        result.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-white">
            {match[1]}
          </strong>
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex));
      }
      return result;
    });

    // 2. Italic: *text*
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      const regex = /\*(.*?)\*/g;
      const result = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index));
        }
        result.push(
          <em key={`italic-${keyIdx++}`} className="italic text-zinc-200">
            {match[1]}
          </em>
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex));
      }
      return result;
    });

    // 3. Inline Code: `code`
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      const regex = /`(.*?)`/g;
      const result = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index));
        }
        result.push(
          <code
            key={`code-${keyIdx++}`}
            className="bg-panel px-1.5 py-0.5 border border-border rounded font-mono text-[11px] text-amber-400"
          >
            {match[1]}
          </code>
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex));
      }
      return result;
    });

    // 4. Links: [text](url)
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;
      const regex = /\[(.*?)\]\((.*?)\)/g;
      const result = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          result.push(part.substring(lastIndex, match.index));
        }
        result.push(
          <a
            key={`link-${keyIdx++}`}
            href={match[2]}
            className="text-emerald-400 hover:text-emerald-300 underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            {match[1]}
          </a>
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < part.length) {
        result.push(part.substring(lastIndex));
      }
      return result;
    });

    return parts;
  };

  const isTableRow = (l: string) => {
    const trimmed = l.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
  };

  const isSeparatorRow = (l: string) => {
    const trimmed = l.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|") && /^\|?(\s*:?-+:?\s*\|)+$/.test(trimmed);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const codeText = codeLines.join("\n");
        blocks.push(
          <CodeBlockWithCopy key={`code-${i}`} code={codeText} language={codeLang} />
        );
        codeLines = [];
        codeLang = "";
      } else {
        const listNode = flushList(i);
        if (listNode) blocks.push(listNode);
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(---|===|\*\*\*|___)$/.test(line.trim())) {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(<hr key={`hr-${i}`} className="my-6 border-t border-border" />);
      continue;
    }

    // Table parsing
    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      
      const headers = line.split("|").map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const alignments = lines[i + 1].split("|").map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(col => {
        if (col.startsWith(":") && col.endsWith(":")) return "center";
        if (col.endsWith(":")) return "right";
        return "left";
      });

      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        const cells = lines[j].split("|").map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        rows.push(cells);
        j++;
      }

      blocks.push(
        <div key={`table-wrapper-${i}`} className="my-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-[#0d0d10] border-b border-border">
                {headers.map((h, idx) => (
                  <th
                    key={`th-${idx}`}
                    style={{ textAlign: alignments[idx] as any }}
                    className="px-4 py-2 font-semibold text-zinc-100"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={`tr-${rowIdx}`}
                  className="border-b border-border/40 hover:bg-panel/20 last:border-b-0 transition-colors"
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={`td-${cellIdx}`}
                      style={{ textAlign: alignments[cellIdx] as any }}
                      className="px-4 py-2 text-zinc-300"
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      i = j - 1;
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(
        <h1
          key={`h1-${i}`}
          className="text-2xl font-bold text-white mt-6 mb-3 pb-1 border-b border-border/80 tracking-tight"
        >
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(
        <h2
          key={`h2-${i}`}
          className="text-lg font-bold text-zinc-100 mt-5 mb-2.5 pb-1 border-b border-border/40 tracking-tight"
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-zinc-200 mt-4 mb-2 tracking-tight">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-4 border-emerald-500/60 bg-panel/30 pl-4 py-2 my-3 text-zinc-400 italic rounded-r-md"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Lists
    const bulletMatch = line.match(/^(\s*)([-*])\s(.*)/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s(.*)/);

    if (bulletMatch) {
      const content = bulletMatch[3];
      const checkMatch = content.match(/^(\[[ xX]\])\s(.*)/);
      if (checkMatch) {
        if (inList && listType !== "check") {
          const listNode = flushList(i); if (listNode) blocks.push(listNode);
        }
        inList = true;
        listType = "check";
        listItems.push(content);
      } else {
        if (inList && listType !== "bullet") {
          const listNode = flushList(i); if (listNode) blocks.push(listNode);
        }
        inList = true;
        listType = "bullet";
        listItems.push(content);
      }
      continue;
    }

    if (orderedMatch) {
      const content = orderedMatch[3];
      if (inList && listType !== "ordered") {
        const listNode = flushList(i); if (listNode) blocks.push(listNode);
      }
      inList = true;
      listType = "ordered";
      listItems.push(content);
      continue;
    }

    // Paragraph or empty line
    if (line.trim() === "") {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(<div key={`empty-${i}`} className="h-2" />);
    } else {
      const listNode = flushList(i); if (listNode) blocks.push(listNode);
      blocks.push(
        <p key={`p-${i}`} className="text-zinc-300 text-sm leading-relaxed my-2">
          {renderInline(line)}
        </p>
      );
    }
  }

  // Flush any final active list
  const finalListNode = flushList(lines.length);
  if (finalListNode) blocks.push(finalListNode);

  return <div className="space-y-1 pb-10">{blocks}</div>;
}

function CodeBlockWithCopy({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border">
      <div className="flex justify-between items-center bg-[#0d0d10] px-4 py-2 border-b border-border font-mono text-[10px] text-muted">
        <span>{language || "plaintext"}</span>
        <button
          onClick={copy}
          className="hover:text-zinc-100 transition-colors bg-panel px-2 py-0.5 rounded border border-border/80"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-[#060608] p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
