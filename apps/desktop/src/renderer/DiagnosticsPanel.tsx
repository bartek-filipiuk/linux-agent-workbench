import { useEffect, useState } from "react";
type State = { running: boolean; step: string; file?: string };
export function DiagnosticsPanel() {
  const [state, setState] = useState<State>({ running: false, step: "" });
  const [error, setError] = useState("");
  useEffect(() => { const off = window.workbench.onDiagnostics(setState); void window.workbench.getDiagnostics().then(setState); return off; }, []);
  const start = async () => {
    setError(""); setState({ running: true, step: "Collecting diagnostics…" });
    try { const file = await window.workbench.writeDiagnostics(); setState(s => ({ ...s, running: false, file })); }
    catch (e) { setState(s => ({ ...s, running: false })); setError(String(e)); }
  };
  return <div className="diagnostics-panel">
    <div className="row"><button className="btn" disabled={state.running} onClick={() => void start()}>Diagnostics</button>{state.running && <button className="btn" onClick={() => void window.workbench.cancelDiagnostics()}>Cancel</button>}</div>
    {state.step && <p role="status">{state.step}</p>}
    {state.file && <button className="btn" title={state.file} onClick={() => void navigator.clipboard.writeText(state.file ?? "").catch(e => setError(String(e)))}>Copy report path</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
