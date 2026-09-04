import { useEffect, useState } from "react";
import { CATEGORY_LABEL, label } from "./labels";

export type ApprovalView = { id: string; command: string; category: string; summary: string; expiresAt: number };

export function ApprovalCard({ a }: { a: ApprovalView }) {
  const [left, setLeft] = useState(Math.max(0, Math.round((a.expiresAt - Date.now()) / 1000)));
  const decide = (d: "once" | "session" | "deny") => void window.workbench.decideApproval(a.id, d);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.round((a.expiresAt - Date.now()) / 1000))), 1000);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "y") decide("once");
      else if (e.key === "n") decide("deny");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [a.id, a.expiresAt]);

  return (
    <div className="approval" role="alertdialog" aria-labelledby={`ap-${a.id}`}>
      <div className="approval-head">
        <span id={`ap-${a.id}`}>Approval needed · {label(CATEGORY_LABEL, a.category)}</span>
        <span className="approval-ttl">{left > 0 ? `expires in ${left}s` : "expired"}</span>
      </div>
      <div className="approval-summary">{a.summary}</div>
      <pre className="approval-cmd">{a.command}</pre>
      <div className="row split">
        <button className="btn" onClick={() => decide("once")} title="Shortcut: y">Allow once</button>
        <button className="btn" onClick={() => decide("session")}>Allow for this run</button>
        <button className="btn danger" onClick={() => decide("deny")} title="Shortcut: n">Deny</button>
      </div>
    </div>
  );
}
