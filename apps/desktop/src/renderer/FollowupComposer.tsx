import { useRef, useState } from "react";
import { useDraftStorage } from "./TaskComposer";

export type Conversation = {
  runId: string; conversationId: string; state: string; endReason?: string;
  messages: { id: string; role: "user" | "assistant"; text: string }[];
};

export function FollowupComposer({ conversation, busy, ready, refresh }: {
  conversation: Conversation; busy: boolean; ready: boolean; refresh: () => void;
}) {
  const key = `law.followup:${conversation.conversationId}`;
  const [text, setText] = useState(() => { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } });
  const [pending, setPending] = useState<"send" | "pause" | null>(null);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const draft = useDraftStorage(key, text);
  const submit = async (action: "send" | "pause") => {
    if (locked.current || (action === "send" && (!ready || !text.trim()))) return;
    locked.current = true; setPending(action); setError(""); draft.flush();
    try {
      if (action === "pause") await window.workbench.pauseRun(conversation.runId);
      else { await window.workbench.sendFollowup(conversation.runId, text.trim()); setText(""); }
      refresh();
    } catch (e) { setError(String(e)); refresh(); }
    finally { locked.current = false; setPending(null); }
  };
  return <form className="followup-composer" aria-label="Continue conversation" onSubmit={e => { e.preventDefault(); void submit("send"); }}>
    <label htmlFor="followup-message">{busy ? "Guide the agent" : "Continue this conversation"}</label>
    <textarea id="followup-message" value={text} maxLength={4000} rows={3} disabled={pending !== null}
      placeholder="Add an instruction or ask about the result…" onChange={e => setText(e.target.value)} onBlur={draft.flush}
      onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void submit("send"); } }} aria-describedby="followup-help" />
    <div className="followup-actions">
      {busy && <button className="btn" type="button" disabled={pending !== null} onClick={() => void submit("pause")}>{pending === "pause" ? "Pausing…" : "Pause"}</button>}
      <button className="btn primary" disabled={pending !== null || !ready || !text.trim()}>{pending === "send" ? busy ? "Interrupting…" : "Continuing…" : busy ? "Interrupt & send" : "Continue"}</button>
    </div>
    <p id="followup-help" className="composer-help">Same conversation, workspace and limits. Ctrl+Enter sends.</p>
    {!ready && <p className="composer-help" role="status">Reconnect the workspace and finish browser recovery or manual login to send. Your draft stays here.</p>}
    {(error || draft.error) && <p className="error" role="alert">{error || draft.error}</p>}
  </form>;
}
