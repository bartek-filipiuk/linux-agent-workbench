import { useState } from "react";
import type { BudgetAction } from "@law/protocol";
import type { RunView } from "./run-view";

export function BudgetPause({ run, disabled }: { run: RunView; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const reason = run.budget?.reason;
  const actions: { action: BudgetAction; label: string }[] = reason === "maxDurationMs"
    ? [{ action: "add_time", label: "Add 30 minutes" }, { action: "unlimited_time", label: "Continue without a time limit" }]
    : reason === "maxCostUsd" ? [{ action: "add_cost", label: "Add $10 to spending limit" }]
    : [{ action: "add_steps", label: "Add 100 steps" }, { action: "unlimited_steps", label: "Continue without a step limit" }];
  const resume = async (action: BudgetAction) => {
    if (!run.runId || pending) return;
    setPending(true); setError("");
    try { await window.workbench.continueBudget(run.runId, action); }
    catch (e) { setError(String(e)); }
    finally { setPending(false); }
  };
  return <section className="budget-pause" aria-label="Task limit reached">
    <h3>{reason === "maxDurationMs" ? "Active time limit reached" : reason === "maxCostUsd" ? "Spending limit reached" : "Step or tool limit reached"}</h3>
    <p>The task is paused with its context saved in this session. You have control.</p>
    <div className="row">{actions.map(a => <button key={a.action} className="btn" disabled={disabled || pending || !reason} onClick={() => void resume(a.action)}>{a.label}</button>)}</div>
    <p className="composer-help">{reason === "maxDurationMs" ? "Step and spending limits stay unchanged." : `Time limit: ${run.budget?.limits.maxDurationMs == null ? "none" : `${run.budget.limits.maxDurationMs / 60000} active minutes`}.`}</p>
    {disabled && <p className="composer-help">Finish manual login and reconnect the workspace before continuing.</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
