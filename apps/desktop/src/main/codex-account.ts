import { CodexProcess, type CodexOptions } from "@law/agentd/codex-process";
import { CodexModel } from "@law/protocol";

export type AccountState = { state: "signed_out" | "ready" | "waiting" | "error"; email?: string; plan?: string; message?: string };
type AccountRpc = Pick<CodexProcess, "request" | "send" | "next" | "close">;
export class CodexAccount {
  private loginProcess: AccountRpc | undefined;
  private loginAbort: AbortController | undefined;
  private generation = 0;
  constructor(private options: () => CodexOptions, private changed: (state: AccountState) => void, private create: (options: CodexOptions) => AccountRpc = o => new CodexProcess(o)) {}
  private async start() {
    const rpc = this.create(this.options());
    try {
      await rpc.request("initialize", { clientInfo: { name: "law_setup", version: "0.0.1" }, capabilities: {} }, AbortSignal.timeout(15000));
      rpc.send({ method: "initialized", params: {} });
      return rpc;
    } catch (e) { rpc.close(); throw e; }
  }
  async read(): Promise<AccountState> {
    const rpc = await this.start();
    try {
      const { account } = await rpc.request("account/read", { refreshToken: false }, AbortSignal.timeout(15000));
      return account?.type === "chatgpt" ? { state: "ready", email: account.email, plan: account.planType } : { state: "signed_out" };
    } finally { rpc.close(); }
  }
  async models(): Promise<CodexModel[]> {
    const rpc = await this.start();
    const signal = AbortSignal.timeout(15000);
    try {
      const models = new Map<string, CodexModel>();
      const cursors = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = await rpc.request("model/list", { limit: 100, includeHidden: false, ...(cursor ? { cursor } : {}) }, signal);
        for (const item of CodexModel.array().parse(page.data)) {
          if (!item.hidden && (!item.inputModalities || item.inputModalities.includes("image"))) models.set(item.model, item);
        }
        cursor = page.nextCursor ?? undefined;
        if (cursor && (typeof cursor !== "string" || cursors.has(cursor) || cursors.size >= 20)) throw new Error("Invalid model catalog pagination");
        if (cursor) cursors.add(cursor);
      } while (cursor);
      return [...models.values()];
    } finally { rpc.close(); }
  }
  async login(): Promise<string> {
    this.cancel();
    const generation = this.generation;
    const rpc = await this.start();
    if (generation !== this.generation) { rpc.close(); throw new Error("Sign-in cancelled"); }
    this.loginProcess = rpc;
    try {
      const reply = await rpc.request("account/login/start", { type: "chatgpt" }, AbortSignal.timeout(15000));
      if (generation !== this.generation) throw new Error("Sign-in cancelled");
      const url = new URL(reply.authUrl);
      if (url.protocol !== "https:" || !["auth.openai.com", "chatgpt.com"].includes(url.hostname)) throw new Error("Codex returned an unexpected sign-in URL");
      this.changed({ state: "waiting", message: "Finish signing in in your browser." });
      const abort = new AbortController();
      this.loginAbort = abort;
      const timer = setTimeout(() => abort.abort(new Error("Sign-in timed out. Try again.")), 5 * 60_000);
      void (async () => {
        try {
          for (;;) {
            const event = await rpc.next(abort.signal);
            if (event.method !== "account/login/completed" || event.params?.loginId !== reply.loginId) continue;
            if (!event.params.success) throw new Error(event.params.error || "Sign-in was not completed");
            const state = await this.read();
            if (generation === this.generation) this.changed(state);
            return;
          }
        } catch (e) {
          if (this.loginProcess === rpc) this.changed({ state: "error", message: e instanceof Error ? e.message : String(e) });
        } finally {
          clearTimeout(timer);
          rpc.close();
          if (this.loginProcess === rpc) this.loginProcess = undefined;
        }
      })();
      return url.href;
    } catch (e) { rpc.close(); if (this.loginProcess === rpc) this.loginProcess = undefined; throw e; }
  }
  cancel(): void {
    this.generation++;
    const rpc = this.loginProcess;
    this.loginProcess = undefined;
    this.loginAbort?.abort();
    rpc?.close();
  }
}
