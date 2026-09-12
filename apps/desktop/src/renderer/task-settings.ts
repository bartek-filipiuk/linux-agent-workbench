import { RunLimits, type RunLimits as Limits } from "@law/protocol";

export const STYLES = {
  quick: { name: "General", description: "Chooses an approach for your task, using the browser and terminal as needed." },
  research: { name: "Research & data", description: "Reads sources in the browser and saves captured text with source links for comparison or a coding agent." },
  project: { name: "Build with a coding agent", description: "Coordinates another coding agent in the terminal and checks its work. That agent needs its own setup and sign-in." },
} as const;
export type TaskPreferences = { profile: keyof typeof STYLES; stepMode: "unlimited" | "custom"; steps: string; timeMode: "none" | "30" | "60" | "custom"; minutes: string };
export const DEFAULT_TASK_PREFERENCES: TaskPreferences = { profile: "quick", stepMode: "unlimited", steps: "100", timeMode: "30", minutes: "30" };
export const TASK_PREFERENCES_KEY = "law.task-preferences";

export function readTaskPreferences(raw: string | null): TaskPreferences {
  try {
    const p = JSON.parse(raw ?? "null");
    if (!p || !Object.hasOwn(STYLES, p.profile) || !["unlimited", "custom"].includes(p.stepMode) || !["none", "30", "60", "custom"].includes(p.timeMode)
      || typeof p.steps !== "string" || p.steps.length > 8 || typeof p.minutes !== "string" || p.minutes.length > 8) return { ...DEFAULT_TASK_PREFERENCES };
    return { profile: p.profile, stepMode: p.stepMode, steps: p.steps, timeMode: p.timeMode, minutes: p.minutes };
  } catch { return { ...DEFAULT_TASK_PREFERENCES }; }
}
export function taskLimits(p: TaskPreferences): { limits?: Limits; error?: string } {
  const integer = (s: string, max: number) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= max;
  if (p.stepMode === "custom" && !integer(p.steps, 10000)) return { error: "Enter a whole number of steps from 1 to 10,000, or choose No step limit." };
  if (p.timeMode === "custom" && !integer(p.minutes, 1440)) return { error: "Enter a whole number of minutes from 1 to 1,440, or choose No time limit." };
  return { limits: RunLimits.parse({ maxTurns: p.stepMode === "unlimited" ? null : Number(p.steps), maxDurationMinutes: p.timeMode === "none" ? null : Number(p.timeMode === "custom" ? p.minutes : p.timeMode) }) };
}
