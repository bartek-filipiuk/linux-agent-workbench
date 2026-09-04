import { z } from "zod";
import { BrowserAction, BrowserObserveInput, BrowserWaitInput, ProtocolError, type BrowserObservation } from "@law/protocol";
import type { ToolCall, ToolExecutor, ToolSpec } from "../provider/types.js";
import type { BrowserSessionManager } from "../session/browser-session-manager.js";
import { observationHints } from "../policy/browser-policy.js";

const schema = (s: z.ZodType) => z.toJSONSchema(s, { target: "draft-7", unrepresentable: "any" }) as Record<string, unknown>;
const ActArgs = z.object({ action: BrowserAction });
const NoArgs = z.object({}).strict();

export const BROWSER_TOOLS: ToolSpec[] = [
  {
    name: "browser_observe",
    description:
      "Describe the current page: url, title, interactive elements with short-lived refs (e1, e2, …), roles, names, values, whether they are in the viewport, the list of open pages, scroll position and the last dialog. Refs are valid only for the returned revision. Set screenshot=true when the text is not enough to understand the layout.",
    parameters: schema(BrowserObserveInput),
  },
  {
    name: "browser_act",
    description:
      "Act on the page. action.kind: navigate {url} (http/https only), click {ref, revision}, type {ref, revision, text, submit?} (replaces the field content; submit presses Enter), press {key}, select {ref, revision, values}, mouse {x, y, action: move|down|up|wheel, deltaY}, switchPage {pageId}, closePage {pageId}, wait {ms}. A stale revision is refused: observe again first. Logins, passwords and CAPTCHAs are for the human: call request_human.",
    parameters: schema(ActArgs),
  },
  {
    name: "browser_wait",
    description: "Wait until text (regex) or a CSS selector appears, or until a load state (load|networkidle), up to timeoutMs (default 15000). Returns matched/timedOut and the current url.",
    parameters: schema(BrowserWaitInput),
  },
  { name: "browser_downloads", description: "List files downloaded during this session.", parameters: schema(NoArgs) },
];

function parseArgs<T>(s: z.ZodType<T>, args: unknown, tool: string): T {
  const r = s.safeParse(args ?? {});
  if (!r.success) throw new ProtocolError("INVALID_INPUT", `${tool}: ${r.error.issues.map((i) => i.message).join("; ")}`);
  return r.data;
}

export type BrowserToolTarget = Pick<BrowserSessionManager, "observe" | "act" | "wait" | "downloads" | "start" | "status">;

/** The screenshot travels to the model as an image part, never inside the JSON text. */
export function browserExecutor(browser: BrowserToolTarget): ToolExecutor {
  const ready = async () => {
    if (browser.status.state !== "ready") {
      const st = await browser.start();
      if (st.state !== "ready") throw new ProtocolError("WORKER_UNAVAILABLE", `browser not available: ${st.message ?? st.state}`);
    }
  };
  return {
    specs: BROWSER_TOOLS,
    async execute(call: ToolCall, signal: AbortSignal) {
      await ready();
      switch (call.name) {
        case "browser_observe": {
          const obs: BrowserObservation = await browser.observe(parseArgs(BrowserObserveInput, call.args, call.name), signal);
          const { screenshotJpegBase64, ...text } = obs;
          const hints = observationHints(obs);
          return { output: JSON.stringify(hints.length ? { ...text, hints } : text), ...(screenshotJpegBase64 ? { imageJpegBase64: screenshotJpegBase64 } : {}) };
        }
        case "browser_act":
          return { output: JSON.stringify(await browser.act(parseArgs(ActArgs, call.args, call.name).action, signal)) };
        case "browser_wait":
          return { output: JSON.stringify(await browser.wait(parseArgs(BrowserWaitInput, call.args, call.name), signal)) };
        case "browser_downloads":
          parseArgs(NoArgs, call.args, call.name);
          return { output: JSON.stringify({ downloads: await browser.downloads() }) };
        default:
          throw new ProtocolError("INVALID_INPUT", `unknown tool ${call.name}`);
      }
    },
  };
}
