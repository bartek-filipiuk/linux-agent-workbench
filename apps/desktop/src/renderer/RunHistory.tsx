import { useEffect, useRef, useState } from "react";
export type HistoryRow = { id: string; goal: string; state: string; startedAt: number; endedAt: number | null };
export type HistoryDetail = HistoryRow & { finalText: string; endReason: string | null; events: Array<{ type: string; text: string; ts: number }> };
export function RunHistory({ workspace, revision, onContinue }: { workspace?: string | undefined; revision: string; onContinue: (goal: string, result: string) => void }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    let current = true;
    generation.current++; setLoading(false);
    setDetail(null); setError("");
    if (!workspace) { setRows([]); return; }
    void window.workbench.getHistory().then(r => { if (current) setRows(r); }).catch(e => { if (current) setError(String(e)); });
    return () => { current = false; generation.current++; };
  }, [workspace, revision]);
  const inspect = async (id: string) => {
    const request = generation.current;
    setLoading(true); setError("");
    try { const result = await window.workbench.getRunDetail(id); if (request === generation.current) setDetail(result); }
    catch (e) { if (request === generation.current) setError(String(e)); }
    finally { if (request === generation.current) setLoading(false); }
  };
  return <details className="run-history"><summary>Recent tasks ({rows.length})</summary>
    {rows.length === 0 && <p className="hint">No recent tasks in this workspace.</p>}
    <ol>{rows.map(r => <li key={r.id}><button className="history-choice" disabled={loading} onClick={() => void inspect(r.id)}>{r.goal}<span>{r.state} · {new Date(r.startedAt).toLocaleString()}</span></button></li>)}</ol>
    {detail && <div className="history-detail"><h3>{detail.state}</h3><p>{detail.goal}</p><pre>{detail.finalText || detail.endReason || "No final answer recorded."}</pre><div className="row"><button className="btn" onClick={() => onContinue(detail.goal, detail.finalText)}>Draft new task from result</button><button className="btn" onClick={() => void navigator.clipboard.writeText(detail.finalText || detail.goal).catch(e => setError(String(e)))}>Copy result</button></div><details><summary>Recorded activity</summary><ol>{detail.events.map((e,i)=><li key={i}>{e.text}</li>)}</ol></details></div>}
    {error && <p className="error" role="alert">{error}</p>}
  </details>;
}
