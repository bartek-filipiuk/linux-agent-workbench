import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const STORAGE_KEY = "law.drawer-width";
const MIN = 320;
const MAX = 600;
const clamp = (width: number) => Math.min(MAX, Math.max(MIN, width));

export function PanelLayout({ surfaces, drawer, labelledBy }: { surfaces: ReactNode; drawer: ReactNode; labelledBy: string }) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(saved) && saved > 0 ? clamp(saved) : 460;
    } catch { return 460; }
  });
  const drag = useRef<{ x: number; width: number } | null>(null);
  const host = useRef<HTMLElement>(null);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(width)); } catch { /* Optional preference. */ }
  }, [width]);

  return <main className="main" ref={host} style={{ "--drawer-width": `${width}px` } as CSSProperties}>
    <div className="surfaces" role="tabpanel" id="workspace-panels" aria-labelledby={labelledBy}><div className="surface-panels">{surfaces}</div></div>
    <div className="panel-splitter" role="separator" aria-label="Task panel width" aria-orientation="vertical" aria-controls="run-drawer" aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={Math.round(width)} tabIndex={0}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        setWidth((w) => e.key === "Home" ? MIN : e.key === "End" ? MAX : clamp(w + (e.key === "ArrowLeft" ? 20 : -20)));
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, width: host.current?.querySelector(".drawer")?.getBoundingClientRect().width ?? width };
      }}
      onPointerMove={(e) => { if (drag.current) setWidth(clamp(drag.current.width + drag.current.x - e.clientX)); }}
      onPointerUp={(e) => { drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); }}
      onLostPointerCapture={() => { drag.current = null; }}
    />
    {drawer}
  </main>;
}
