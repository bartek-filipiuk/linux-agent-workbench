import { useEffect, useState } from "react";
export type AccountState = { state: "signed_out" | "ready" | "waiting" | "error"; email?: string; plan?: string; message?: string };
export type SetupState = { provider: "codex" | "openai" | "openrouter"; account: AccountState; podman: boolean; image: boolean; providerReady: boolean; workspace: string | null };

export function SetupPanel({ onReady, workspaceReady }: { onReady: (ready: boolean) => void; workspaceReady: boolean }) {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [checking, setChecking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const check = async () => {
    setChecking(true); setError("");
    try { const s = await window.workbench.checkSetup(); setSetup(s); onReady(s.providerReady && s.podman && s.image); }
    catch (e) { setError(String(e)); onReady(false); }
    finally { setChecking(false); }
  };
  useEffect(() => {
    void check();
    return window.workbench.onAccount((account) => {
      setSetup((s) => s ? { ...s, account, providerReady: account.state === "ready" } : s);
      if (account.state === "ready") void check();
      else onReady(false);
    });
  }, []);
  const ready = !!setup?.providerReady && setup.podman && setup.image && workspaceReady;
  const signIn = async () => {
    setError(""); setSigningIn(true);
    try { await window.workbench.loginCodex(); }
    catch (e) { setError(String(e)); }
    finally { setSigningIn(false); }
  };
  return <details className="setup-panel" open={!ready}>
    <summary>{ready ? `${setup.provider === "codex" ? "Codex" : setup.provider === "openrouter" ? "OpenRouter API" : "OpenAI API"} ready${setup.account.email ? ` · ${setup.account.email}` : ""}` : "Set up your workspace"}</summary>
    <div className="setup-content">
      {setup && <>
        <div className="setup-row"><span>Account</span><span>{setup.provider !== "codex" ? (setup.providerReady ? "API key configured" : `Add ${setup.provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY"} to .env`) : setup.account.state === "ready" ? `${setup.account.email ?? "Signed in"} · ${setup.account.plan ?? "ChatGPT"}` : setup.account.message ?? "Sign in with the ChatGPT account you use for Codex."}</span>
          {setup.provider === "codex" && setup.account.state !== "ready" && (setup.account.state === "waiting" ? <button className="btn" onClick={() => void window.workbench.cancelLogin().catch(e => setError(String(e)))}>Cancel sign-in</button> : <button className="btn primary" disabled={signingIn} onClick={() => void signIn()}>{signingIn ? "Opening sign-in…" : "Sign in to Codex"}</button>)}
        </div>
        <div className="setup-row"><span>Environment</span><span>{setup.podman && setup.image ? "Podman and terminal image ready" : !setup.podman ? "Podman is unavailable. Install/start Podman, then recheck." : <>Build the terminal image from the project folder: <code>pnpm images:build</code></>}</span></div>
        <div className="setup-row"><span>Workspace</span><span>{setup.workspace ?? "Choose a folder for the agent's files."}</span><button className="btn" onClick={() => void window.workbench.selectWorkspace().then(check).catch(e => setError(String(e)))}>Choose folder…</button></div>
      </>}
      <div className="row"><button className="btn" disabled={checking} onClick={() => void check()}>{checking ? "Checking…" : "Recheck setup"}</button><button className="btn" onClick={() => void window.workbench.retrySetup().then(check).catch(e => setError(String(e)))}>Retry connection</button></div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  </details>;
}
