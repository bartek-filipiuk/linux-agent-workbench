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
    {run.lastAction && <p className="last-action" title={run.lastAction}>Last action: {run.lastAction}</p>}
  </div>;
});
