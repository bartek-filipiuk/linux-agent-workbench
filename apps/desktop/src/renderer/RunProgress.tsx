import { memo, useEffect, useState } from "react";
import { formatElapsed, RUNNING, runStage, type RunView } from "./run-view";

export const RunProgress = memo(function RunProgress({ run }: { run: RunView }) {
  const [now, setNow] = useState(Date.now);
  const active = run.state !== undefined && RUNNING.has(run.state);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, run.runId]);

  return <div className="run-progress">
    <div className="progress-heading">
      <span role="status">{runStage(run)}</span>
      {run.startedAt !== undefined && <span className="elapsed" title="Elapsed since this UI first observed the run, including time waiting for you">{formatElapsed((run.endedAt ?? now) - run.startedAt)}</span>}
    </div>
    {run.browserEngine && <p className="composer-help">Browser: {run.browserEngine === "jev-first" ? "Jev First" : run.browserEngine === "jev-hybrid" ? "Jev Hybrid" : "Classic"}</p>}
    {run.jev && <p className="composer-help">Jev: {run.jev.decisions} decisions · {(run.jev.elapsedMs / 1000).toFixed(1)}s model time · ${run.jev.costUsd.toFixed(5)} estimated · {run.jev.fallbacks} returns to planner</p>}
    {run.lastAction && <p className="last-action" title={run.lastAction}>Last action: {run.lastAction}</p>}
  </div>;
});
