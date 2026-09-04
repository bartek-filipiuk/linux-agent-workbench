import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const OWNER_COLOR = { human: "#3b82f6", agent: "#ff3b3b" } as const;

export function TerminalPanel({ owner }: { owner: "human" | "agent" }) {
  const host = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

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
    term.loadAddon(fit);
    term.open(el);
    fit.fit();
    window.workbench.terminalResize(term.cols, term.rows);

    const offData = window.workbench.onTerminalData((data) => term.write(data));
    const inputDisposable = term.onData((d) => window.workbench.terminalWrite(d));
    const ro = new ResizeObserver(() => {
      fit.fit();
      window.workbench.terminalResize(term.cols, term.rows);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      inputDisposable.dispose();
      offData();
      termRef.current = null;
      term.dispose();
    };
  }, []);

  return <div ref={host} className={`terminal ${owner}`} />;
}
