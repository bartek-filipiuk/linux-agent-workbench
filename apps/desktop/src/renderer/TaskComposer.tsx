import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ModelPicker, useModelPicker } from "./ModelPicker";
import { DEFAULT_TASK_PREFERENCES, readTaskPreferences, STYLES, TASK_PREFERENCES_KEY, taskLimits, type TaskPreferences } from "./task-settings";

/** Keep typing off synchronous disk APIs; flush on blur, start, page exit and unmount. */
export function useDraftStorage(key: string, value: string) {
  const pending = useRef({ key, value });
  const [error, setError] = useState("");
  const write = useCallback(() => {
    try { localStorage.setItem(pending.current.key, pending.current.value); setError(""); }
    catch { setError("Changes are kept in this window, but could not be saved for next time."); }
  }, []);
  useEffect(() => {
    pending.current = { key, value };
    const timer = setTimeout(write, 300);
    return () => clearTimeout(timer);
  }, [key, value, write]);
  useEffect(() => {
    const exit = () => { try { localStorage.setItem(pending.current.key, pending.current.value); } catch { /* UI already reports saves while mounted. */ } };
    window.addEventListener("pagehide", exit);
    return () => { window.removeEventListener("pagehide", exit); exit(); };
  }, []);
  return { error, flush: write };
}

export const TaskComposer = memo(function TaskComposer({ workspace, ready, expanded, onExpand, continuation, onStarted }: {
  workspace?: string | undefined; ready: boolean; expanded: boolean; onExpand: () => void;
  continuation: { text: string; revision: number } | null; onStarted: () => void;
}) {
  const key = `law.goal:${workspace ?? "none"}`;
  const [goal, setGoal] = useState(() => { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } });
  const [preferences, setPreferences] = useState<TaskPreferences>(() => { try { return readTaskPreferences(localStorage.getItem(TASK_PREFERENCES_KEY)); } catch { return { ...DEFAULT_TASK_PREFERENCES }; } });
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [touched, setTouched] = useState(false);
  const [pasteWarning, setPasteWarning] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const savedGoal = useDraftStorage(key, goal);
  const savedPreferences = useDraftStorage(TASK_PREFERENCES_KEY, JSON.stringify(preferences));
  const picker = useModelPicker();
  const validation = taskLimits(preferences);
  const change = (patch: Partial<TaskPreferences>) => setPreferences(p => ({ ...p, ...patch }));

  useEffect(() => {
    if (!continuation) return;
    setGoal(continuation.text.slice(0, 4000));
    field.current?.focus();
  }, [continuation]);
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    const fit = () => { el.style.height = "auto"; el.style.height = `${Math.min(expanded ? 480 : 300, Math.max(180, el.scrollHeight))}px`; };
    fit();
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => { if (width !== el.clientWidth) { width = el.clientWidth; fit(); } });
    observer.observe(el);
    return () => observer.disconnect();
  }, [goal, expanded]);
  const start = async () => {
    setTouched(true); setActionError("");
    if (!validation.limits || !goal.trim() || !ready || !picker.canStart || starting) return;
    savedGoal.flush(); savedPreferences.flush(); setStarting(true);
    try {
      await window.workbench.startRun(goal, { profile: preferences.profile, limits: validation.limits, modelSelection: picker.runSelection });
      onStarted();
    } catch (e) { setActionError(String(e)); }
    finally { setStarting(false); }
  };
  const limits = validation.limits;
  return <section className={`task-composer${expanded ? " expanded" : ""}`} aria-label="New task settings">
    <div className="composer-fields">
    <div className="composer-heading"><label htmlFor="goal">What should the agent do?</label><button className="btn" type="button" disabled={starting} onClick={onExpand} aria-expanded={expanded}>{expanded ? "Back to preview" : "Expand editor"}</button></div>
    <textarea id="goal" ref={field} value={goal} rows={8} maxLength={4000} disabled={starting} onChange={e => { setGoal(e.target.value); if (e.target.value.length < 4000) setPasteWarning(""); }} onBlur={savedGoal.flush}
      onPaste={e => { const el = e.currentTarget; if (goal.length - (el.selectionEnd - el.selectionStart) + e.clipboardData.getData("text").length > 4000) setPasteWarning("The task limit is 4,000 characters. Only the text that fits can be pasted."); }}
      aria-describedby="goal-count" placeholder="For example: find a useful post in the logged-in browser and save it with its source link to a Markdown file." />
    <p className="composer-count" id="goal-count">{goal.length.toLocaleString()} / 4,000 characters</p>
    {pasteWarning && <p className="notice" role="status">{pasteWarning}</p>}
    <label className="composer-label" htmlFor="task-style">Working style</label>
    <select id="task-style" value={preferences.profile} disabled={starting} onChange={e => change({ profile: e.target.value as TaskPreferences["profile"] })} aria-describedby="style-description">
      {Object.entries(STYLES).map(([id, style]) => <option key={id} value={id}>{style.name}</option>)}
    </select>
    <p className="composer-help" id="style-description">{STYLES[preferences.profile].description}</p>
    <details className="style-legend"><summary>Compare working styles</summary><dl>{Object.entries(STYLES).map(([id, style]) => <div key={id}><dt>{style.name}</dt><dd>{style.description}</dd></div>)}</dl><p className="composer-help">Styles guide the approach. Model and reasoning effort are selected separately.</p></details>
    <div className="task-limit-fields">
      <div><label className="composer-label" htmlFor="step-mode">Steps</label><select id="step-mode" value={preferences.stepMode} disabled={starting} onChange={e => change({ stepMode: e.target.value as TaskPreferences["stepMode"] })}><option value="unlimited">No step limit</option><option value="custom">Custom limit</option></select>
        {preferences.stepMode === "custom" && <label className="limit-number">Maximum steps<input aria-label="Maximum steps" type="text" inputMode="numeric" value={preferences.steps} maxLength={8} disabled={starting} onChange={e => change({ steps: e.target.value })} onBlur={() => { setTouched(true); savedPreferences.flush(); }} /></label>}</div>
      <div><label className="composer-label" htmlFor="time-mode">Active time</label><select id="time-mode" value={preferences.timeMode} disabled={starting} onChange={e => change({ timeMode: e.target.value as TaskPreferences["timeMode"] })}><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="none">No time limit</option><option value="custom">Custom limit</option></select>
        {preferences.timeMode === "custom" && <label className="limit-number">Maximum minutes<input aria-label="Maximum minutes" type="text" inputMode="numeric" value={preferences.minutes} maxLength={8} disabled={starting} onChange={e => change({ minutes: e.target.value })} onBlur={() => { setTouched(true); savedPreferences.flush(); }} /></label>}</div>
    </div>
    <p className="composer-help">A step is one model response, which may request several tools. Limits pause between actions; waiting for you does not use active time.</p>
    {touched && validation.error && <p className="error" role="alert">{validation.error}</p>}
    <details className="composer-model"><summary>Model & reasoning <span>{picker.selection.model ?? "Configured"} · {picker.selection.effort ?? "configured effort"}</span></summary><ModelPicker picker={picker} disabled={starting} />{!picker.isCodex && <p className="composer-help">API model: {picker.catalog?.configuredModel}. Spending limit: $10; the task pauses before further actions when reached.</p>}</details>
    {(picker.invalid || picker.error) && <p className="error" role="alert">{picker.invalid || picker.error} Open Model & reasoning to refresh or change the selection.</p>}
    </div>
    <div className="composer-submit"><button className="btn primary" disabled={starting || !ready || !goal.trim() || !picker.canStart || !limits} onClick={() => void start()}>{starting ? "Starting…" : "Start task"}</button>
      <p className="composer-help">{limits ? `${limits.maxTurns === null ? "No step or tool limit" : `${limits.maxTurns} steps · ${Math.max(200, limits.maxTurns * 3)} tool calls`} · ${limits.maxDurationMinutes === null ? "no time limit" : `${limits.maxDurationMinutes} min active time`}` : "Check the limits above."}</p></div>
    {(actionError || savedGoal.error || savedPreferences.error) && <p className="error" role="alert">{actionError || savedGoal.error || savedPreferences.error}</p>}
  </section>;
});
