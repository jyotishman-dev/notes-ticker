"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  FileText,
  Search,
  X,
  CheckSquare,
  ChevronRight,
  Trash2,
  Pin,
  PinOff,
  SortAsc,
  LayoutGrid,
  List,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteTrack, togglePin } from "@/lib/actions";
import { AddTrackButton } from "@/components/add-track-button";

const COLOR_DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-400",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
};

const COLOR_GLOW: Record<string, string> = {
  emerald: "shadow-emerald-500/10",
  amber: "shadow-amber-500/10",
  cyan: "shadow-cyan-400/10",
  pink: "shadow-pink-500/10",
  violet: "shadow-violet-500/10",
};

const COLOR_BORDER_HOVER: Record<string, string> = {
  emerald: "hover:border-emerald-500/30",
  amber: "hover:border-amber-500/30",
  cyan: "hover:border-cyan-400/30",
  pink: "hover:border-pink-500/30",
  violet: "hover:border-violet-500/30",
};

const COLOR_TEXT: Record<string, string> = {
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  pink: "text-pink-400",
  violet: "text-violet-400",
};

const COLOR_PROGRESS: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-400",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
};

type TrackStat = {
  id: string;
  name: string;
  category: string;
  color: string;
  pinned: boolean;
  totalTasks: number;
  doneTasks: number;
  notesCount: number;
};

type SortMode = "default" | "name" | "tasks" | "notes" | "completion";
type ViewMode = "grid" | "list";

export function DashboardClient({
  tracks,
  totalNotes,
  totalTasks,
  doneTasks,
}: {
  tracks: TrackStat[];
  totalNotes: number;
  totalTasks: number;
  doneTasks: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(tracks.map((t) => t.category))).sort();
    return cats;
  }, [tracks]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = tracks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Sort: pinned always first, then by sort mode
    result = [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortMode) {
        case "name":
          return a.name.localeCompare(b.name);
        case "tasks":
          return b.totalTasks - a.totalTasks;
        case "notes":
          return b.notesCount - a.notesCount;
        case "completion": {
          const pctA = a.totalTasks > 0 ? a.doneTasks / a.totalTasks : 0;
          const pctB = b.totalTasks > 0 ? b.doneTasks / b.totalTasks : 0;
          return pctB - pctA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [tracks, searchQuery, selectedCategory, sortMode]);

  // Group by category for grid view when no category selected
  const grouped = useMemo(() => {
    if (selectedCategory !== "all" || searchQuery.trim()) {
      return null; // Show flat list when filtering
    }
    const groups: Record<string, TrackStat[]> = {};
    for (const t of filtered) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    return groups;
  }, [filtered, selectedCategory, searchQuery]);

  const averageCompletion =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const handleDeleteTrack = (id: string, name: string) => {
    if (
      confirm(
        `Delete "${name}"? This will permanently remove all its tasks and notes.`
      )
    ) {
      startTransition(async () => {
        await deleteTrack(id);
        router.refresh();
      });
    }
  };

  const handleTogglePin = (id: string, pinned: boolean) => {
    startTransition(async () => {
      await togglePin(id, !pinned);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Knowledge base
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">
            TrackForge Notes
          </h1>
          <p className="mt-1 text-sm text-muted">
            High-speed gauntlet documentation &amp; task workspace.
          </p>
        </div>
        <AddTrackButton />
      </div>

      {/* ── Stats Row ── */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Layers className="h-3.5 w-3.5 text-emerald-400" />}
          label="Total Gauntlets"
          value={String(tracks.length)}
          sub={`${tracks.filter((t) => t.pinned).length} pinned`}
        />
        <StatCard
          icon={<CheckSquare className="h-3.5 w-3.5 text-cyan-400" />}
          label="Tasks Done"
          value={`${doneTasks}/${totalTasks}`}
          sub={totalTasks > 0 ? `${averageCompletion}% complete` : "No tasks yet"}
        />
        <StatCard
          icon={<FileText className="h-3.5 w-3.5 text-amber-400" />}
          label="Documents"
          value={String(totalNotes)}
          sub="across all gauntlets"
        />
        <StatCard
          icon={<Sparkles className="h-3.5 w-3.5 text-pink-400" />}
          label="Categories"
          value={String(categories.length)}
          sub={categories.slice(0, 2).join(", ") || "—"}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search gauntlets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-border bg-panel text-sm text-zinc-200 placeholder:text-muted/60 focus:border-zinc-500 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted hover:text-zinc-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-mono transition-all border",
              selectedCategory === "all"
                ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                : "border-border text-muted hover:text-zinc-200 hover:border-zinc-600"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? "all" : cat)
              }
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono transition-all border",
                selectedCategory === cat
                  ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                  : "border-border text-muted hover:text-zinc-200 hover:border-zinc-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sort */}
          <div className="flex items-center gap-1 bg-panel border border-border rounded-lg p-0.5">
            <SortAsc className="h-3.5 w-3.5 text-muted ml-1.5" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-transparent text-xs text-muted focus:outline-none pr-1 py-0.5 cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="name">A–Z</option>
              <option value="tasks">Tasks</option>
              <option value="notes">Notes</option>
              <option value="completion">% Done</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-panel">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-muted hover:text-zinc-200"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-muted hover:text-zinc-200"
              )}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mt-6">
        {filtered.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center py-16 text-center text-muted border border-dashed border-border rounded-xl">
            <Layers className="h-10 w-10 text-muted/20 mb-3" />
            <p className="text-sm font-medium text-zinc-400">
              {searchQuery || selectedCategory !== "all"
                ? "No gauntlets match your filters."
                : "No gauntlets yet."}
            </p>
            <p className="text-xs text-muted/60 mt-1 max-w-[260px]">
              {searchQuery || selectedCategory !== "all"
                ? "Try a different search or category."
                : "Click 'New Gauntlet' above to start your first knowledge track."}
            </p>
          </div>
        )}

        {/* Grouped view (default, no filters active) */}
        {grouped && Object.keys(grouped).length > 0 && (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, catTracks]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted">
                    {cat}
                  </h2>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] font-mono text-muted/60">
                    {catTracks.length} gauntlet{catTracks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {catTracks.map((track) => (
                      <GauntletCard
                        key={track.id}
                        track={track}
                        onDelete={handleDeleteTrack}
                        onPin={handleTogglePin}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {catTracks.map((track) => (
                      <GauntletListRow
                        key={track.id}
                        track={track}
                        onDelete={handleDeleteTrack}
                        onPin={handleTogglePin}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Flat view (when searching or filtering) */}
        {!grouped && filtered.length > 0 && (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((track) => (
                <GauntletCard
                  key={track.id}
                  track={track}
                  onDelete={handleDeleteTrack}
                  onPin={handleTogglePin}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((track) => (
                <GauntletListRow
                  key={track.id}
                  track={track}
                  onDelete={handleDeleteTrack}
                  onPin={handleTogglePin}
                />
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-panel/40 border border-border/80">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted/70 font-mono truncate">{sub}</p>}
    </div>
  );
}

// ── Gauntlet Card (Grid) ─────────────────────────────────────────────────────

function GauntletCard({
  track,
  onDelete,
  onPin,
}: {
  track: TrackStat;
  onDelete: (id: string, name: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const pct =
    track.totalTasks > 0
      ? Math.round((track.doneTasks / track.totalTasks) * 100)
      : 0;
  const dot = COLOR_DOT[track.color] ?? COLOR_DOT.emerald;
  const glow = COLOR_GLOW[track.color] ?? "";
  const borderHover = COLOR_BORDER_HOVER[track.color] ?? "";
  const textCol = COLOR_TEXT[track.color] ?? "text-emerald-400";
  const progressCol = COLOR_PROGRESS[track.color] ?? "bg-emerald-500";

  return (
    <div className={cn("group relative rounded-xl border border-border bg-panel/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5", glow, borderHover)}>
      {/* Pin badge */}
      {track.pinned && (
        <div className="absolute top-3 right-3 z-10">
          <Pin className="h-3 w-3 text-amber-400" />
        </div>
      )}

      <Link href={`/tracks/${track.id}`} className="block p-5">
        <div className="flex items-start gap-2.5">
          <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 shadow-sm", dot)} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-snug text-zinc-100 group-hover:text-white transition-colors truncate pr-6">
              {track.name}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted truncate">
              {track.category}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-1.5">
            <span>Progress</span>
            <span className={cn(pct === 100 ? "text-emerald-400" : "", "font-medium")}>{pct}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-panel overflow-hidden border border-border/30">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progressCol)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Footer stats */}
        <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="h-3 w-3 text-muted shrink-0" />
              <span className="font-semibold text-zinc-300">
                {track.doneTasks}
                <span className="text-muted font-normal">/{track.totalTasks}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-muted shrink-0" />
              <span className="font-semibold text-zinc-300">
                {track.notesCount}
                <span className="text-muted font-normal ml-1">docs</span>
              </span>
            </div>
          </div>
          <ChevronRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5 shrink-0", textCol)} />
        </div>
      </Link>

      {/* Actions (hover) */}
      <div className="absolute bottom-3.5 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); onPin(track.id, track.pinned); }}
          className="p-1 rounded border border-border bg-[#0d0d10] text-muted hover:text-amber-400 hover:border-amber-900/40 transition-all"
          title={track.pinned ? "Unpin" : "Pin to top"}
        >
          {track.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onDelete(track.id, track.name); }}
          className="p-1 rounded border border-border bg-[#0d0d10] text-muted hover:text-red-400 hover:border-red-900/40 transition-all"
          title="Delete gauntlet"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Gauntlet List Row ────────────────────────────────────────────────────────

function GauntletListRow({
  track,
  onDelete,
  onPin,
}: {
  track: TrackStat;
  onDelete: (id: string, name: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const pct =
    track.totalTasks > 0
      ? Math.round((track.doneTasks / track.totalTasks) * 100)
      : 0;
  const dot = COLOR_DOT[track.color] ?? COLOR_DOT.emerald;
  const progressCol = COLOR_PROGRESS[track.color] ?? "bg-emerald-500";

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-panel/20 hover:bg-panel/40 hover:border-zinc-600 transition-all px-4 py-3">
      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 shadow-sm", dot)} />

      <Link href={`/tracks/${track.id}`} className="flex-1 min-w-0 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
              {track.name}
            </h3>
            {track.pinned && <Pin className="h-3 w-3 text-amber-400 shrink-0" />}
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted truncate mt-0.5">
            {track.category}
          </p>
        </div>

        {/* Progress */}
        <div className="w-24 shrink-0 hidden sm:block">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-1">
            <span>{pct}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-panel overflow-hidden border border-border/30">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progressCol)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs shrink-0 hidden md:flex">
          <div className="flex items-center gap-1.5 text-muted">
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="text-zinc-300 font-semibold">{track.doneTasks}/{track.totalTasks}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-zinc-300 font-semibold">{track.notesCount}</span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onPin(track.id, track.pinned)}
          className="p-1.5 rounded border border-border bg-[#0d0d10] text-muted hover:text-amber-400 hover:border-amber-900/40 transition-all"
          title={track.pinned ? "Unpin" : "Pin to top"}
        >
          {track.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(track.id, track.name)}
          className="p-1.5 rounded border border-border bg-[#0d0d10] text-muted hover:text-red-400 hover:border-red-900/40 transition-all"
          title="Delete gauntlet"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
