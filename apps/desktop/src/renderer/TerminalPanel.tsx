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
    const fit = new FitAddon();
    fitRef.current = fit;
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    window.workbench.terminalResize(term.cols, term.rows);
    window.workbench.terminalRefresh(); // a fresh xterm is blank until tmux repaints

    const offData = window.workbench.onTerminalData((data) => term.write(data));
    const inputDisposable = term.onData((d) => window.workbench.terminalWrite(d));
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === 0 || el.clientHeight === 0) return; // hidden: keep the last real size
      fit.fit();
      window.workbench.terminalResize(term.cols, term.rows);
    });
    ro.observe(el);
    return () => {
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
