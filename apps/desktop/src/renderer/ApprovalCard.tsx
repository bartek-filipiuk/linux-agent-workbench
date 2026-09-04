export type ApprovalView = { id: string; command: string; category: string; summary: string; expiresAt: number };

export function ApprovalCard({ a }: { a: ApprovalView }) {
  const decide = (d: "once" | "session" | "deny") => void window.workbench.decideApproval(a.id, d);
  return (
    <div className="approval">
      <div className="approval-head">Approval needed · {a.category}</div>
      <div className="approval-summary">{a.summary}</div>
      <pre className="approval-cmd">{a.command}</pre>
      <div className="row">
        <button className="btn primary" onClick={() => decide("once")}>Allow once</button>
        <button className="btn" onClick={() => decide("session")}>Allow for this run</button>
        <button className="btn danger" onClick={() => decide("deny")}>Deny</button>
      </div>
    </div>
  );
}
