import { useEffect, useRef, useState } from "react";

export type BrowserStatus = { state: "idle" | "starting" | "ready" | "stopped" | "error"; url?: string; title?: string; message?: string };

const KEY_MAP: Record<string, string> = { " ": "Space" };

// Human-only surface in B1: the canvas shows the sandbox browser and forwards pointer and keyboard input.
export function BrowserPanel({ status, owner }: { status: BrowserStatus; owner: "human" | "agent" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewport = useRef({ width: 1280, height: 800 });
  const decoding = useRef(false);
  const [url, setUrl] = useState("https://example.com");
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);

  useEffect(() => {
    // Mirror real navigations into the bar; a fresh profile starts on about:blank, which is not worth showing.
    if (status.url && status.state === "ready" && status.url !== "about:blank") setUrl(status.url);
  }, [status.url, status.state]);

  useEffect(() => {
    const off = window.workbench.onBrowserFrame(({ width, height, data }) => {
      frameCount.current++;
      if (decoding.current) return; // drop the frame; a newer one is on its way
      decoding.current = true;
      viewport.current = { width, height };
      createImageBitmap(new Blob([data as BlobPart], { type: "image/jpeg" }))
        .then((bmp) => {
          const c = canvasRef.current;
          if (!c) return;
          if (c.width !== bmp.width || c.height !== bmp.height) {
            c.width = bmp.width;
            c.height = bmp.height;
          }
          c.getContext("2d")!.drawImage(bmp, 0, 0);
          bmp.close();
        })
        .catch(() => {})
        .finally(() => (decoding.current = false));
    });
    const t = setInterval(() => {
      setFps(frameCount.current);
      frameCount.current = 0;
    }, 1000);
    return () => {
      off();
      clearInterval(t);
    };
  }, []);

  const toViewport = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: Math.round(((e.clientX - r.left) / r.width) * viewport.current.width), y: Math.round(((e.clientY - r.top) / r.height) * viewport.current.height) };
  };
  const button = (e: React.MouseEvent) => (e.button === 1 ? "middle" : e.button === 2 ? "right" : "left");
  const send = (event: unknown) => window.workbench.browserInput(event);

  const onKey = (kind: "keydown" | "keyup") => (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!human || e.key === "Escape" || (e.ctrlKey && e.key.toLowerCase() === "l")) return; // leave app shortcuts alone
    e.preventDefault();
    send({ kind, key: KEY_MAP[e.key] ?? e.key });
  };

  const live = status.state === "ready";
  const human = owner === "human";
  return (
    <section className="browser">
      <form
        className="urlbar"
        onSubmit={(e) => {
          e.preventDefault();
          void window.workbench.navigate(url);
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" spellCheck={false} disabled={!live || !human} />
        <button className="btn" type="submit" disabled={!live || !human}>Go</button>
        {live ? (
          <button className="btn" type="button" onClick={() => void window.workbench.stopBrowser()}>Close browser</button>
        ) : (
          <button className="btn primary" type="button" disabled={status.state === "starting"} onClick={() => void window.workbench.startBrowser()}>
            {status.state === "starting" ? "Starting…" : "Open browser"}
          </button>
        )}
        <span className="hint">{live ? `${status.title ?? ""} · ${fps} fps` : status.state === "error" ? status.message : "sandbox browser is closed"}</span>
      </form>
      <div className={`browser-stage ${owner}`}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          width={1280}
          height={800}
          onMouseMove={(e) => live && human && send({ kind: "mousemove", ...toViewport(e) })}
          onMouseDown={(e) => {
            e.currentTarget.focus();
            if (live && human) send({ kind: "mousedown", ...toViewport(e), button: button(e) });
          }}
          onMouseUp={(e) => live && human && send({ kind: "mouseup", ...toViewport(e), button: button(e) })}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => live && human && send({ kind: "wheel", ...toViewport(e), deltaX: Math.round(e.deltaX), deltaY: Math.round(e.deltaY) })}
          onKeyDown={onKey("keydown")}
          onKeyUp={onKey("keyup")}
        />
      </div>
    </section>
  );
}
