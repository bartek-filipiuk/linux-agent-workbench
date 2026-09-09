import { useEffect, useState } from "react";
import { ModelSelection, validateModelSelection, type ModelCatalog } from "@law/protocol";

const preferenceKey = "law.codex-model-selection";
export function useModelPicker() {
  const [selection, setSelection] = useState<ModelSelection>(() => {
    try { return ModelSelection.parse(JSON.parse(localStorage.getItem(preferenceKey) ?? "{}")); } catch { return {}; }
  });
  const [catalog, setCatalog] = useState<ModelCatalog>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const load = async (refresh = false) => {
    setLoading(true); setError("");
    try { setCatalog(await window.workbench.getModels(refresh)); }
    catch (e) { setError(`Cannot load models. ${String(e)}`); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const change = (next: ModelSelection) => {
    setSelection(next);
    try { localStorage.setItem(preferenceKey, JSON.stringify(next)); setSaveError(""); }
    catch { setSaveError("Selection applies now, but could not be saved for next time."); }
  };
  const isCodex = catalog?.provider !== "openai";
  let invalid = "";
  if (isCodex && selection.model && !loading) {
    try { validateModelSelection(selection, catalog?.models ?? []); }
    catch (e) { invalid = e instanceof Error ? e.message : String(e); }
  }
  return { selection, catalog, loading, error, saveError, invalid, change, load, isCodex,
    runSelection: isCodex ? selection : {}, canStart: !loading && !invalid };
}

export function ModelPicker({ picker, disabled }: { picker: ReturnType<typeof useModelPicker>; disabled: boolean }) {
  const { catalog, selection, loading, error, saveError, invalid, change, load, isCodex } = picker;
  if (!isCodex) return null;
  const model = catalog?.models.find(m => m.model === selection.model);
  const effort = selection.effort ?? "";
  const unavailableEffort = effort && !model?.supportedReasoningEfforts.some(e => e.reasoningEffort === effort);
  return <div className="model-picker">
    <div className="model-fields">
      <label htmlFor="run-model">Model
        <select id="run-model" value={selection.model ?? ""} disabled={disabled || loading} onChange={e => {
          const next = catalog?.models.find(m => m.model === e.target.value);
          if (!next) { change({}); return; }
          const nextEffort = next.supportedReasoningEfforts.some(e => e.reasoningEffort === effort) ? effort : next.defaultReasoningEffort;
          change({ model: next.model, ...(next.supportedReasoningEfforts.some(e => e.reasoningEffort === nextEffort) ? { effort: nextEffort } : {}) });
        }} aria-describedby="model-picker-note">
          <option value="">{loading ? "Loading models…" : catalog?.configuredModel && catalog.configuredModel !== "codex-default" ? `Configured: ${catalog.configuredModel}` : "From Codex settings"}</option>
          {selection.model && !model && <option value={selection.model} disabled>{selection.model} (unavailable)</option>}
          {catalog?.models.map(m => <option key={m.model} value={m.model}>{m.displayName || m.model}</option>)}
        </select>
      </label>
      <label htmlFor="run-effort">Effort
        <select id="run-effort" value={effort} disabled={disabled || loading || !model || !model.supportedReasoningEfforts.length} onChange={e => change({ model: model!.model, ...(e.target.value ? { effort: e.target.value } : {}) })} aria-describedby="model-picker-note">
          <option value="">Configured</option>
          {unavailableEffort && <option value={effort} disabled>{effort} (unavailable)</option>}
          {model?.supportedReasoningEfforts.map(e => <option key={e.reasoningEffort} value={e.reasoningEffort}>{e.reasoningEffort}</option>)}
        </select>
      </label>
    </div>
    <div className="model-picker-help">
      <p id="model-picker-note">{disabled ? "Locked for this run." : "Saved for new runs. Higher effort can take longer."}</p>
      <button className="btn" type="button" disabled={disabled || loading} onClick={() => void load(true)} aria-label="Refresh model list">Refresh</button>
    </div>
    {(error || invalid || saveError) && <p className="error" role="alert">{[error, invalid, saveError].filter(Boolean).join(" ")}</p>}
  </div>;
}
