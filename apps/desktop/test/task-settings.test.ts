import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_PREFERENCES, readTaskPreferences, taskLimits } from "../src/renderer/task-settings.js";
import { RunLimits, BudgetAction } from "@law/protocol";

describe("task limits", () => {
  it("persists the Auto experiment while keeping the default engine", () => {
    expect(readTaskPreferences(JSON.stringify({...DEFAULT_TASK_PREFERENCES,browserEngine:"jev-auto"})).browserEngine).toBe("jev-auto");
    expect(DEFAULT_TASK_PREFERENCES.browserEngine).toBe("classic");
  });
  it("defaults to unlimited steps with an explicit 30 minute pause", () => {
    expect(taskLimits(readTaskPreferences(null))).toEqual({ limits: { maxTurns: null, maxDurationMinutes: 30 } });
    expect(taskLimits({ ...DEFAULT_TASK_PREFERENCES, timeMode: "none" })).toEqual({ limits: { maxTurns: null, maxDurationMinutes: null } });
  });
  it("preserves partial edits across reloads and never silently clamps a typed limit", () => {
    for (const steps of ["", "1", "12", "120", "0", "10001", "1e2", "-1", "1.5"]) {
      const p = { ...DEFAULT_TASK_PREFERENCES, stepMode: "custom" as const, steps };
      expect(readTaskPreferences(JSON.stringify(p))).toEqual(p);
      const result = taskLimits(p);
      if (["1", "12", "120"].includes(steps)) expect(result.limits?.maxTurns).toBe(Number(steps));
      else expect(result.error).toBeTruthy();
    }
  });
  it("rejects malformed IPC limits and cost bypass attempts", () => {
    for (const maxTurns of [0, -1, "100", Infinity, 10001]) expect(RunLimits.safeParse({ maxTurns, maxDurationMinutes: 30 }).success).toBe(false);
    expect(RunLimits.safeParse({ maxTurns: null, maxDurationMinutes: null, maxCostUsd: null }).success).toBe(false);
    expect(BudgetAction.safeParse("unlimited_cost").success).toBe(false);
    expect(readTaskPreferences('{"profile":"toString"}')).toEqual(DEFAULT_TASK_PREFERENCES);
    expect(readTaskPreferences("invalid")).toEqual(DEFAULT_TASK_PREFERENCES);
  });
});
