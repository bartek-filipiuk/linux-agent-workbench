import { useEffect, useRef, useState } from "react";
import { CATEGORY_LABEL, label } from "./labels";

export type ApprovalView = { id: string; command: string; category: string; summary: string; expiresAt: number };

export function ApprovalCard({ a }: { a: ApprovalView }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((a.expiresAt - Date.now()) / 1000)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitted = useRef(false);
  const decide = async (decision: "once" | "session" | "deny") => {
    // A ref also blocks two clicks before React has rendered the disabled state.
    if (submitted.current || Date.now() >= a.expiresAt) return;
    submitted.current = true;
    setPending(true);
    setError("");
    try {
      await window.workbench.decideApproval(a.id, decision);
      // Keep disabled until the daemon confirms with approval.resolved.
    } catch (e) {
      submitted.current = false;
      setPending(false);
      setError(`Decision was not sent. Try again. ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((a.expiresAt - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, [a.expiresAt]);

  return (
    <div className="approval" role="alertdialog" aria-labelledby={`ap-${a.id}`} aria-describedby={`ap-summary-${a.id}`} tabIndex={0}
      onKeyDown={(e) => {
        // Explicitly focus a card to use shortcuts. Incoming cards never steal the
        // terminal's focus, and replacing a resolved card cannot approve the next one.
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.nativeEvent.isComposing) return;
        if (e.key !== "y" && e.key !== "n") return;
        e.preventDefault();
        e.stopPropagation();
        void decide(e.key === "y" ? "once" : "deny");
      }}>
      <div className="approval-head">
        <span id={`ap-${a.id}`}>Approval needed · {label(CATEGORY_LABEL, a.category)}</span>
        <span className="approval-ttl">{left > 0 ? `expires in ${left}s` : "expired"}</span>
      </div>
      <div className="approval-summary" id={`ap-summary-${a.id}`}>{a.summary}</div>
      <pre className="approval-cmd">{a.command}</pre>
      <div className="row split">
        <button className="btn" disabled={pending || left === 0} onClick={() => void decide("once")} title="Shortcut: y while this card has focus">Allow once</button>
        <button className="btn" disabled={pending || left === 0} onClick={() => void decide("session")}>Allow for this run</button>
        <button className="btn danger" disabled={pending || left === 0} onClick={() => void decide("deny")} title="Shortcut: n while this card has focus">Deny</button>
      </div>
      <span className="hint approval-help">{pending ? "Waiting for confirmation…" : left === 0 ? "Expired — waiting for the agent to close this request." : "Y: allow once · N: deny. Shortcuts work only while this card has focus."}</span>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
