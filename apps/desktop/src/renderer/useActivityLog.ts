import { useLayoutEffect, useRef, useState } from "react";
import type { RunView } from "./run-view";

const NEAR_BOTTOM = 32;
type Anchor = { id: string; offset: number };

export function useActivityLog(run: RunView, thinking: boolean) {
  const logRef = useRef<HTMLOListElement>(null);
  const follow = useRef(true);
  const [following, setFollowing] = useState(true);
  const [unread, setUnread] = useState(0);
  const seen = useRef(0);
  const runId = useRef(run.runId);
  const anchor = useRef<Anchor | null>(null);
  const programmaticTop = useRef<number | null>(null);

  const rememberPosition = () => {
    const el = logRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const row = [...el.querySelectorAll<HTMLElement>("[data-log-id]")].find((r) => r.getBoundingClientRect().bottom > top);
    anchor.current = row ? { id: row.dataset.logId!, offset: row.getBoundingClientRect().top - top } : null;
  };
  const scrollToLatest = () => {
    const el = logRef.current;
    if (!el) return;
    const result = run.state === "completed" ? el.querySelector<HTMLElement>(".final") : null;
    if (result) el.scrollTop += result.getBoundingClientRect().top - el.getBoundingClientRect().top;
    else el.scrollTop = el.scrollHeight;
    programmaticTop.current = el.scrollTop;
  };
  const showLatest = () => {
    follow.current = true;
    setFollowing(true);
    seen.current = run.activityVersion;
    setUnread(0);
    scrollToLatest();
  };
  const onScroll = () => {
    const el = logRef.current;
    if (!el) return;
    if (programmaticTop.current !== null && Math.abs(el.scrollTop - programmaticTop.current) < 1) {
      programmaticTop.current = null;
      return;
    }
    programmaticTop.current = null;
    const near = el.scrollHeight - el.clientHeight - el.scrollTop <= NEAR_BOTTOM;
    follow.current = near;
    setFollowing(near);
    if (near) { seen.current = run.activityVersion; setUnread(0); }
    else rememberPosition();
  };

  useLayoutEffect(() => {
    if (runId.current !== run.runId) {
      runId.current = run.runId;
      follow.current = true;
      anchor.current = null;
      seen.current = 0;
      setFollowing(true);
    }
    if (follow.current) {
      scrollToLatest();
      seen.current = run.activityVersion;
      setUnread(0);
    } else {
      // Preserve a visible row even when the bounded log discards rows above it.
      const el = logRef.current;
      if (el && anchor.current) {
        const row = el.querySelector<HTMLElement>(`[data-log-id="${anchor.current.id}"]`);
        if (row) el.scrollTop += row.getBoundingClientRect().top - el.getBoundingClientRect().top - anchor.current.offset;
        else el.scrollTop = 0; // The row itself left the retained 500-entry history.
        programmaticTop.current = el.scrollTop;
        rememberPosition();
      }
      setUnread(Math.max(0, run.activityVersion - seen.current));
    }
  }, [run.runId, run.activityVersion, thinking, run.finalText, run.state]);

  return { logRef, onScroll, following, unread, showLatest };
}
