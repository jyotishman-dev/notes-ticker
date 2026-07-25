import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Compute current streak (consecutive days with at least one completed task)
// and today's count, given a list of completedAt dates.
export function computeStreak(completedDates: Date[]): { streakDays: number; doneToday: number } {
  if (completedDates.length === 0) return { streakDays: 0, doneToday: 0 };

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = dayKey(new Date());

  const days = new Set(completedDates.map(dayKey));
  const doneToday = completedDates.filter((d) => dayKey(d) === today).length;

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = dayKey(cursor);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { streakDays: streak, doneToday };
}
