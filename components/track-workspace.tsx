"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
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
  LayoutGrid,
  FileEdit,
  PlusCircle,
  X,
  Settings
} from "lucide-react";
import {
  toggleTask,
  updateTaskNotes,
  updateTaskContent,
  deleteTask,
  addTask,
  addPhase,
  updatePhase,
  deletePhase,
  updateTrackNotes,
  updateTrack
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

interface ClientTrack {
  id: string;
  name: string;
  category: string;
  color: string;
  notes: string | null;
  phases: ClientPhase[];
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
  // 1. Client State
  const [track, setTrack] = useState<ClientTrack>(initialTrack);
  const [activeNote, setActiveNote] = useState<{ type: "track" | "task"; id: string }>({
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
  
  // Modal states for creating/editing phases & tracks
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [phaseModalTitle, setPhaseModalTitle] = useState("");
  const [phaseModalConcept, setPhaseModalConcept] = useState("");
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newPhaseConcept, setNewPhaseConcept] = useState("");

  // Track settings states
  const [trackSettingsName, setTrackSettingsName] = useState(track.name);
  const [trackSettingsCategory, setTrackSettingsCategory] = useState(track.category);
  const [trackSettingsColor, setTrackSettingsColor] = useState(track.color);

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
    } else {
      // Find task notes
      let foundNotes = "";
      for (const phase of track.phases) {
        const task = phase.tasks.find((t) => t.id === activeNote.id);
        if (task) {
          foundNotes = task.notes || "";
          break;
        }
      }
      setEditorText(foundNotes);
    }
    setSaveStatus("saved");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [activeNote, track.id]);

  // Save note immediately without debounce
  const saveCurrentNote = async (type: "track" | "task", id: string, val: string) => {
    try {
      if (type === "track") {
        await updateTrackNotes(id, val || null);
      } else {
        await updateTaskNotes(id, val || null);
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to save notes:", err);
      setSaveStatus("error");
    }
  };

  const handleSelectNote = async (type: "track" | "task", id: string) => {
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
    } else {
      setTrack((prev) => {
        const nextPhases = prev.phases.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === activeNote.id ? { ...t, notes: val } : t))
        }));
        return { ...prev, phases: nextPhases };
      });
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 600ms of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (activeNote.type === "track") {
          await updateTrackNotes(track.id, val || null);
        } else {
          await updateTaskNotes(activeNote.id, val || null);
        }
        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to save notes:", err);
        setSaveStatus("error");
      }
    }, 600);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  // Add Task under a Phase
  const handleAddTask = async (phaseId: string, content: string) => {
    if (!content.trim()) return;
    const tempId = `temp-${Date.now()}`;
    
    const newTaskObj: ClientTask = {
      id: tempId,
      phaseId,
      content: content.trim(),
      notes: "",
      completed: false,
      completedAt: null,
      order: 999
    };

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.map((p) => {
        if (p.id === phaseId) {
          return { ...p, tasks: [...p.tasks, newTaskObj] };
        }
        return p;
      })
    }));

    // Server update
    try {
      const createdTask = await addTask(phaseId, content);
      if (createdTask) {
        // Swap temp ID with actual db ID
        setTrack((prev) => ({
          ...prev,
          phases: prev.phases.map((p) => {
            if (p.id === phaseId) {
              return {
                ...p,
                tasks: p.tasks.map((t) => (t.id === tempId ? { ...t, id: createdTask.id } : t))
              };
            }
            return p;
          })
        }));
        
        // If the user selected the temp task, switch selection to real ID
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

  // Add Phase
  const handleAddPhase = async () => {
    if (!newPhaseTitle.trim()) return;
    const tempId = `temp-phase-${Date.now()}`;
    const nextIndex = track.phases.length;

    const newPhaseObj: ClientPhase = {
      id: tempId,
      trackId: track.id,
      index: nextIndex,
      title: newPhaseTitle.trim(),
      concept: newPhaseConcept.trim() || null,
      tasks: []
    };

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: [...prev.phases, newPhaseObj]
    }));

    setIsAddingPhase(false);
    setNewPhaseTitle("");
    setNewPhaseConcept("");

    // Server update
    try {
      const createdPhase = await addPhase(track.id, newPhaseObj.title, newPhaseObj.concept || undefined);
      if (createdPhase) {
        // Swap temp ID with db ID
        setTrack((prev) => ({
          ...prev,
          phases: prev.phases.map((p) => (p.id === tempId ? { ...p, id: createdPhase.id } : p))
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Phase Info
  const handleEditPhase = async () => {
    if (!editingPhaseId || !phaseModalTitle.trim()) return;

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.map((p) =>
        p.id === editingPhaseId
          ? { ...p, title: phaseModalTitle.trim(), concept: phaseModalConcept.trim() || null }
          : p
      )
    }));

    const targetId = editingPhaseId;
    const targetTitle = phaseModalTitle;
    const targetConcept = phaseModalConcept;

    setEditingPhaseId(null);

    // Server update
    startTransition(async () => {
      await updatePhase(targetId, targetTitle, targetConcept);
    });
  };

  // Delete Phase
  const handleDeletePhase = (phaseId: string) => {
    // Find if active note is in the phase
    const targetPhase = track.phases.find((p) => p.id === phaseId);
    const containsActive = targetPhase?.tasks.some((t) => t.id === activeNote.id);
    if (containsActive) {
      setActiveNote({ type: "track", id: track.id });
    }

    // Update local state instantly
    setTrack((prev) => ({
      ...prev,
      phases: prev.phases.filter((p) => p.id !== phaseId)
    }));

    // Server update
    startTransition(async () => {
      await deletePhase(phaseId);
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
    : (() => {
        for (const phase of track.phases) {
          const t = phase.tasks.find((t) => t.id === activeNote.id);
          if (t) return t.content;
        }
        return "Notes";
      })();

  const activeNoteParent = activeNote.type === "task"
    ? (() => {
        for (const phase of track.phases) {
          if (phase.tasks.some((t) => t.id === activeNote.id)) {
            return `Phase ${phase.index}: ${phase.title}`;
          }
        }
        return "";
      })()
    : "";

  // Statistics
  const allTasks = track.phases.flatMap((p) => p.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.completed).length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  
  const notesCount = (track.notes ? 1 : 0) + allTasks.filter((t) => t.notes).length;

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

          {/* Section: Phases & Checklist */}
          <div>
            <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
              <span>Gauntlet Map</span>
              <span>{notesCount} note{notesCount === 1 ? "" : "s"}</span>
            </div>

            <div className="space-y-3 mt-1.5">
              {track.phases.map((phase) => {
                const phaseMatches =
                  matchesSearch(phase.title) ||
                  (phase.concept && matchesSearch(phase.concept)) ||
                  phase.tasks.some((t) => matchesSearch(t.content) || (t.notes && matchesSearch(t.notes)));

                if (hasSearchMatches && !phaseMatches) return null;

                const allPhaseCompleted = phase.tasks.length > 0 && phase.tasks.every(t => t.completed);

                return (
                  <div key={phase.id} className="rounded-lg border border-border/40 bg-panel/20 p-1.5">
                    {/* Phase Header */}
                    <div className="flex items-start justify-between px-1.5 py-1 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-mono text-xs font-semibold", allPhaseCompleted ? "text-emerald-400" : "text-muted")}>
                            P{phase.index}
                          </span>
                          <span className="font-semibold text-xs text-zinc-200 truncate">{phase.title}</span>
                        </div>
                        {phase.concept && (
                          <p className="text-[10px] text-muted truncate mt-0.5">{phase.concept}</p>
                        )}
                      </div>
                      
                      {/* Phase Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingPhaseId(phase.id);
                            setPhaseModalTitle(phase.title);
                            setPhaseModalConcept(phase.concept || "");
                          }}
                          className="p-1 text-muted hover:text-zinc-100 rounded hover:bg-panel"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete Phase P${phase.index}: "${phase.title}" and all its tasks?`)) {
                              handleDeletePhase(phase.id);
                            }
                          }}
                          className="p-1 text-muted hover:text-red-400 rounded hover:bg-panel"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Tasks Checklist */}
                    <div className="mt-1 space-y-0.5">
                      {phase.tasks.map((task) => {
                        const taskMatches =
                          matchesSearch(task.content) ||
                          (task.notes && matchesSearch(task.notes));

                        if (hasSearchMatches && !taskMatches) return null;

                        const isSelected = activeNote.type === "task" && activeNote.id === task.id;

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-center justify-between group/task pl-2 pr-1 py-1 rounded-md text-xs transition-all",
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
                                    matched: "{getSearchSnippet(task.notes, searchQuery)}"
                                  </span>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {task.notes && (
                                <span className={cn("text-[9px] px-1 py-0.2 rounded font-mono border", theme.text, theme.border)}>
                                  Note
                                </span>
                              )}
                              <div className="opacity-0 group-hover/task:opacity-100 flex items-center transition-opacity">
                                <button
                                  onClick={() => {
                                    const nextName = prompt("Rename Task:", task.content);
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

                      {/* Add Task Input inside Phase */}
                      <AddTaskInline onAdd={(content) => handleAddTask(phase.id, content)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Add Phase */}
        <div className="p-3 border-t border-border bg-[#0a0a0c]/80">
          {isAddingPhase ? (
            <div className="space-y-2 p-2 rounded-lg border border-border bg-panel">
              <input
                type="text"
                placeholder="Phase Title (e.g. Setup)"
                value={newPhaseTitle}
                onChange={(e) => setNewPhaseTitle(e.target.value)}
                className="w-full px-2 py-1 rounded bg-base text-xs border border-border focus:border-zinc-500 focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                placeholder="Blurb/Concept (Optional)"
                value={newPhaseConcept}
                onChange={(e) => setNewPhaseConcept(e.target.value)}
                className="w-full px-2 py-1 rounded bg-base text-xs border border-border focus:border-zinc-500 focus:outline-none"
              />
              <div className="flex justify-end gap-1 text-[10px]">
                <button
                  onClick={() => setIsAddingPhase(false)}
                  className="px-2.5 py-1 text-muted hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPhase}
                  disabled={!newPhaseTitle.trim()}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-medium"
                >
                  Add Phase
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingPhase(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border hover:border-zinc-600 rounded-lg text-xs text-muted hover:text-zinc-200 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add New Phase
            </button>
          )}
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

      {/* DIALOG: EDIT PHASE MODAL */}
      {editingPhaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Edit Phase Details</h3>
            <p className="text-xs text-muted mt-1">Modify title and concept blurb for this phase.</p>
            
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">Phase Title</label>
                <input
                  type="text"
                  value={phaseModalTitle}
                  onChange={(e) => setPhaseModalTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">Concept Blurb</label>
                <input
                  type="text"
                  value={phaseModalConcept}
                  onChange={(e) => setPhaseModalConcept(e.target.value)}
                  className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingPhaseId(null)}
                className="px-4 py-2 border border-border rounded-lg text-muted hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPhase}
                disabled={!phaseModalTitle.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2 text-xs">
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
      )}
    </div>
  );
}

// Inline input for adding task rapidly
function AddTaskInline({ onAdd }: { onAdd: (content: string) => void }) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState("");

  const submit = () => {
    if (val.trim()) {
      onAdd(val);
      setVal("");
    }
    setActive(false);
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="w-full flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-panel/30 text-[11px] text-muted hover:text-zinc-300 transition-colors mt-1"
      >
        <Plus className="h-3 w-3" />
        <span>Add checklist item...</span>
      </button>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded bg-panel/40 border border-border/60">
      <Circle className="h-3 w-3 text-zinc-600 shrink-0" />
      <input
        type="text"
        placeholder="Type item name..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setActive(false);
        }}
        className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-muted focus:outline-none"
        autoFocus
        onBlur={submit}
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
