import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const OWNER_COLOR = { human: "#3b82f6", agent: "#ff3b3b" } as const;

export function TerminalPanel({ owner, visible = true }: { owner: "human" | "agent"; visible?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const term = termRef.current;
    if (term) term.options.theme = { ...term.options.theme, cursor: OWNER_COLOR[owner] };
  }, [owner]);

  useEffect(() => {
    const el = host.current!;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
      fontSize: 14,
      scrollback: 5000,
      theme: { background: "#0b0d10", foreground: "#e6e8eb", cursor: "#3b82f6" },
    });
    termRef.current = term;
    // Ctrl+V would otherwise go to the shell as \x16 (readline quoted-insert) and Ctrl+Shift+C as a key; returning
    // false hands them to the browser, whose Edit menu roles turn them into a paste event (which xterm handles) and a copy.
    term.attachCustomKeyEventHandler((e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === "v" || (k === "c" && e.shiftKey))) return false;
      if (e.shiftKey && e.key === "Insert") return false;
      return true;
    });
    const fit = new FitAddon();
    fitRef.current = fit;
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    window.workbench.terminalResize(term.cols, term.rows);
    window.workbench.terminalRefresh(); // a fresh xterm is blank until tmux repaints

    const offData = window.workbench.onTerminalData((data) => term.write(data));
    const inputDisposable = term.onData((d) => window.workbench.terminalWrite(d));
    // Debounced: a window drag fires dozens of observations, each of which would be a SIGWINCH, a full
    // tmux repaint and a revision bump the model may be holding an expectedRevision against.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let last = { cols: term.cols, rows: term.rows };
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === 0 || el.clientHeight === 0) return; // hidden: keep the last real size
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fit.fit();
        if (term.cols === last.cols && term.rows === last.rows) return;
        last = { cols: term.cols, rows: term.rows };
        window.workbench.terminalResize(term.cols, term.rows);
      }, 90);
    });
    ro.observe(el);
    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
      inputDisposable.dispose();
      offData();
      termRef.current = null;
      fitRef.current = null;
      term.dispose();
    };
  }, []);

  // Coming back from the browser view: refit (the size may have changed meanwhile) and repaint.
  useEffect(() => {
    if (!visible) return;
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    const id = requestAnimationFrame(() => {
      fit.fit();
      window.workbench.terminalResize(term.cols, term.rows);
      term.refresh(0, term.rows - 1);
      window.workbench.terminalRefresh();
      term.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  return <div ref={host} className={`terminal ${owner}${visible ? "" : " is-hidden"}`} />;
}
