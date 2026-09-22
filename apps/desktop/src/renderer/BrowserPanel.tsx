import type { BrowserInfo, BrowserControl } from "@law/protocol";
import { useEffect, useRef, useState } from "react";

export type BrowserStatus = { state: "idle" | "starting" | "ready" | "crashed" | "stopped" | "error"; message?: string } & Partial<BrowserInfo>;

const KEY_MAP: Record<string, string> = { " ": "Space" };

// Human-only surface in B1: the canvas shows the sandbox browser and forwards pointer and keyboard input.
export function BrowserPanel({ status, owner, runActive }: { status: BrowserStatus; owner: "human" | "agent"; runActive: boolean }) {
  const panelRef = useRef<HTMLElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const pressedKeys = useRef(new Set<string>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewport = useRef({ width: 1280, height: 800 });
  const decoding = useRef(false);
  const [url, setUrl] = useState("https://example.com");
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const newestFrame = useRef(0);
  const [displayedGeneration, setDisplayedGeneration] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const restartLock = useRef(false);
  const restart = async () => {
    if (restartLock.current || !window.confirm("Restart only the browser? The agent will stop. Saved browser profile and workspace files are kept; unsaved page input and recent login changes may be lost.")) return;
    restartLock.current = true; setRestarting(true); setActionError("");
    try { await window.workbench.restartBrowser(); }
    catch (e) { setActionError(String(e)); }
    finally { restartLock.current = false; setRestarting(false); }
  };
  const control = async (command: BrowserControl) => {
    setPending(true); setActionError("");
    try { await window.workbench.browserControl(command); }
    catch (e) { setActionError(String(e)); }
    finally { setPending(false); }
  };
  useEffect(() => {
    setPreviewError("");
    if (status.state !== "ready" && status.state !== "crashed") { newestFrame.current = -1; setDisplayedGeneration(null); }
    if (status.state !== "ready" || displayedGeneration === status.generation) return;
    const timer = setTimeout(() => setPreviewError(status.transitioning ? "Browser mode is still switching. If it does not finish, restart the browser using the button above." : "No image received. Refresh the preview, or restart the browser if it remains unresponsive."), 8000);
    return () => clearTimeout(timer);
  }, [status.state, status.generation, status.transitioning, displayedGeneration]);

  useEffect(() => {
    // Mirror real navigations into the bar; a fresh profile starts on about:blank, which is not worth showing.
    if (status.url && status.state === "ready" && status.url !== "about:blank") setUrl(status.url);
  }, [status.url, status.state]);

  useEffect(() => {
    let visible = false;
    const visibility = () => window.workbench.browserFrames(visible && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; visibility(); });
    if (panelRef.current) observer.observe(panelRef.current);
    document.addEventListener("visibilitychange", visibility); // frames only flow to the renderer while this panel is on screen
    const off = window.workbench.onBrowserFrame(({ id, generation, width, height, data }) => {
      frameCount.current++;
      if (!visible || document.visibilityState !== "visible" || decoding.current) { window.workbench.browserFrameAck(id); return; } // drop the frame; a newer one is on its way
      decoding.current = true;
      newestFrame.current = id;
      viewport.current = { width, height };
      createImageBitmap(new Blob([data as BlobPart], { type: "image/jpeg" }))
        .then((bmp) => {
          const c = canvasRef.current;
          if (!c || newestFrame.current !== id) { bmp.close(); return; }
          if (c.width !== bmp.width || c.height !== bmp.height) {
            c.width = bmp.width;
            c.height = bmp.height;
          }
          c.getContext("2d")!.drawImage(bmp, 0, 0);
          bmp.close(); setDisplayedGeneration(generation); setPreviewError("");
        })
        .catch(() => setPreviewError("Image could not be decoded. Refresh the preview."))
        .finally(() => { decoding.current = false; window.workbench.browserFrameAck(id); });

    });
    visibility();
    const t = setInterval(() => {
      setFps(frameCount.current);
      frameCount.current = 0;
    }, 1000);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.workbench.browserFrames(false);
      off(); newestFrame.current = -1;
      clearInterval(t);
      if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current);
      pendingMove.current = null; pendingWheel.current = null;
      for (const key of pressedKeys.current) window.workbench.browserInput({ kind: "keyup", key });
      pressedKeys.current.clear();
    };
  }, []);

  const toViewport = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: Math.round(((e.clientX - r.left) / r.width) * viewport.current.width), y: Math.round(((e.clientY - r.top) / r.height) * viewport.current.height) };
  };
  const button = (e: React.MouseEvent) => (e.button === 1 ? "middle" : e.button === 2 ? "right" : "left");
  const send = (event: unknown) => window.workbench.browserInput(event);
  // Pointer moves and wheel ticks arrive faster than frames can show them; keep the latest move and the summed
  // wheel delta per animation frame and flush them before any button event so the order stays right.
  const pendingMove = useRef<{ x: number; y: number } | null>(null);
  const pendingWheel = useRef<{ x: number; y: number; deltaX: number; deltaY: number } | null>(null);
  const moveFrame = useRef<number | null>(null);
  const flushPointer = () => {
    if (moveFrame.current !== null) { cancelAnimationFrame(moveFrame.current); moveFrame.current = null; }
    if (pendingMove.current) { send({ kind: "mousemove", ...pendingMove.current }); pendingMove.current = null; }
    if (pendingWheel.current) { send({ kind: "wheel", ...pendingWheel.current }); pendingWheel.current = null; }
  };
  const schedulePointer = () => { moveFrame.current ??= requestAnimationFrame(() => { moveFrame.current = null; flushPointer(); }); };
  const queueMove = (p: { x: number; y: number }) => { pendingMove.current = p; schedulePointer(); };
  const queueWheel = (p: { x: number; y: number }, deltaX: number, deltaY: number) => {
    const w = pendingWheel.current;
    pendingWheel.current = { ...p, deltaX: (w?.deltaX ?? 0) + deltaX, deltaY: (w?.deltaY ?? 0) + deltaY };
    schedulePointer();
  };

  const isPaste = (e: React.KeyboardEvent) => ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") || (e.shiftKey && e.key === "Insert");
  const releaseKeys = () => {
    for (const key of pressedKeys.current) send({ kind: "keyup", key });
    pressedKeys.current.clear();
  };
  const onKey = (kind: "keydown" | "keyup") => (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!live || !human || !previewReady) return;
    if (!status.manual && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      if (kind === "keydown") { addressRef.current?.focus(); addressRef.current?.select(); }
      return;
    }
    // Tab belongs to host focus navigation. Explicit page-tab buttons below
    // advance focus inside the remote browser without trapping the host keyboard.
    if (e.key === "Tab" || e.key === "Escape" || isPaste(e)) return;
    e.preventDefault();
    const key = KEY_MAP[e.key] ?? e.key;
    if (kind === "keydown") { pressedKeys.current.add(key); send({ kind, key }); }
    else if (pressedKeys.current.delete(key)) send({ kind, key });
  };
  const pageTab = (backwards: boolean) => {
    if (!live || !human || !previewReady) return;
    canvasRef.current?.focus();
    if (backwards) send({ kind: "keydown", key: "Shift" });
    send({ kind: "keydown", key: "Tab" });
    send({ kind: "keyup", key: "Tab" });
    if (backwards) send({ kind: "keyup", key: "Shift" });
  };

  const live = status.state === "ready" || status.state === "crashed";
  const human = owner === "human" && !pending && !restarting && !status.transitioning;
  const previewReady = !status.crashed && (status.generation === undefined || displayedGeneration === status.generation);
  return (
    <section ref={panelRef} className="browser" aria-label="Sandbox browser">
      <form
        className="urlbar"
        onSubmit={(e) => {
          e.preventDefault();
          setActionError(""); void window.workbench.navigate(url).catch(e => setActionError(String(e)));
        }}
      >
        <input ref={addressRef} aria-label="Browser address" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" spellCheck={false} disabled={!live || !human || status.manual} />
        <button className="btn" type="submit" disabled={!live || !human || status.manual}>Go</button>
        {live ? (
          <button className="btn" type="button" disabled={pending || status.transitioning} onClick={() => void window.workbench.stopBrowser()}>Close browser</button>
        ) : (
          <button className="btn primary" type="button" disabled={status.state === "starting"} onClick={() => void window.workbench.startBrowser()}>
            {status.state === "starting" ? "Starting…" : "Open browser"}
          </button>
        )}
        {live && runActive && !status.manual && (human ? (
          <button className="btn" type="button" onClick={() => void window.workbench.releaseControl("browser")}>Give browser to agent</button>
        ) : (
          <button className="btn" type="button" onClick={() => void window.workbench.takeControl("browser")}>Take the browser</button>
        ))}
        {status.state !== "idle" && <button className="btn danger" type="button" disabled={restarting || status.state === "starting"} onClick={() => void restart()}>{restarting ? "Restarting…" : "Restart browser"}</button>}
        <span className="hint">{live ? `${status.title ?? ""} · ${fps} fps` : status.state === "error" ? status.message : "sandbox browser is closed"}</span>
      </form>
      {live && <div className="browser-tabs">
        {!status.manual && (status.pages?.length ?? 0) > 0 && <><label htmlFor="browser-pages">Tab / window</label><select id="browser-pages" value={status.activePageId ?? ""} disabled={!human} onChange={e => void control({ kind: "switch", pageId: e.target.value })}>{status.pages!.map(p => <option key={p.id} value={p.id}>{p.title || p.url}</option>)}</select><button className="btn" disabled={!human || status.pages!.length < 2} onClick={() => status.activePageId && void control({ kind: "close", pageId: status.activePageId })}>Close tab</button></>}
        <button className="btn" disabled={pending || status.transitioning || (status.crashed && !human)} onClick={() => void control({ kind: status.crashed ? "recover" : "refresh" })}>{status.crashed ? "Recover tab" : "Refresh preview"}</button>
        {!status.manual && <button className="btn" disabled={!human || !status.url} title="Deletes this site's cookies and reloads the page; use it when a site keeps answering &quot;You have been blocked&quot;" onClick={() => void control({ kind: "clearSiteData" })}>Clear site cookies</button>}
        {status.manualAvailable && <button className="btn" disabled={pending || status.transitioning} onClick={() => void control({ kind: "manual", enabled: !status.manual })}>{pending || status.transitioning ? "Switching…" : status.manual ? "Finish manual login" : "Log in manually"}</button>}
      </div>}
      {(actionError || status.message) && <p className="browser-notice error" role="alert">{actionError || status.message}</p>}
      {status.manual && <p className="browser-notice" role="status">Manual login · agent paused. Use the browser address bar below to open the site and sign in. Finish manual login saves the session; resume the agent separately.</p>}
      {status.dialog && <div className="browser-notice" role="alertdialog" aria-label="Browser dialog"><p>{status.dialog.message}</p><button className="btn" onClick={() => void control({ kind: "dialog", accept: false })}>Dismiss</button>{status.dialog.type !== "alert" && <button className="btn" onClick={() => void control({ kind: "dialog", accept: true })}>Confirm</button>}</div>}
      <div className="browser-keyboard">
        <span id="browser-key-help" className="hint">Tab leaves preview · Ctrl/⌘+L edits address</span>
        <button className="btn" disabled={!live || !human} onClick={() => pageTab(false)} aria-label="Focus next element in the remote page">Page Tab</button>
        <button className="btn" disabled={!live || !human} onClick={() => pageTab(true)} aria-label="Focus previous element in the remote page">Page Shift+Tab</button>
        <button className="btn" disabled={!live || !human} onClick={() => { canvasRef.current?.focus(); send({ kind: "keydown", key: "Escape" }); send({ kind: "keyup", key: "Escape" }); }}>Page Esc</button>
      </div>
      <div className={`browser-stage ${owner}`}>
        {live && (previewError || status.frameError || status.transitioning || (status.generation !== undefined && displayedGeneration !== status.generation)) && <div className="preview-notice" role="status"><p>{status.frameError || previewError || (status.transitioning ? "Switching browser mode…" : "Connecting preview…")}</p>{!status.transitioning && <button className="btn" disabled={pending || (status.crashed && !human)} onClick={() => void control({ kind: status.crashed ? "recover" : "refresh" })}>{status.crashed ? "Recover tab" : "Retry preview"}</button>}</div>}
        <canvas
          ref={canvasRef}
          tabIndex={live ? 0 : -1}
          aria-label="Interactive sandbox browser preview"
          aria-describedby="browser-key-help"
          onBlur={releaseKeys}
          width={1280}
          height={800}
          onMouseMove={(e) => live && human && previewReady && queueMove(toViewport(e))}
          onMouseDown={(e) => {
            e.currentTarget.focus();
            if (live && human && previewReady) { flushPointer(); send({ kind: "mousedown", ...toViewport(e), button: button(e) }); }
          }}
          onMouseUp={(e) => { if (live && human && previewReady) { flushPointer(); send({ kind: "mouseup", ...toViewport(e), button: button(e) }); } }}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => live && human && previewReady && queueWheel(toViewport(e), Math.round(e.deltaX), Math.round(e.deltaY))}
          onKeyDown={onKey("keydown")}
          onKeyUp={onKey("keyup")}
          onPaste={(e) => {
            // Host clipboard text is typed into the focused field of the sandbox page; it never reaches the model or the logs.
            e.preventDefault();
            const text = e.clipboardData.getData("text");
            if (live && human && previewReady && text) send({ kind: "insert", text: text.slice(0, 4096) });
          }}
        />
      </div>
      {!!status.diagnostics?.length && <details className="browser-diagnostics"><summary>Connection details ({status.diagnostics.length})</summary><ol>{status.diagnostics.map((d,i) => <li key={i}>{d.message}</li>)}</ol></details>}
    </section>
  );
}
