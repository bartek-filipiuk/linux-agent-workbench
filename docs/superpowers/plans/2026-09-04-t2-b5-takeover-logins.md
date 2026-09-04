# T2 B5 — Browser takeover, login handoff, acceptance on a real account

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** When the agent runs into a login form, password field, 2FA or CAPTCHA in the browser, the run pauses into handoff automatically, the human gets the browser (and terminal) lease, logs in through the canvas, and gives control back; the agent continues from a fresh observation. The human can also take just the browser mid-run. Nothing typed by the human in the browser is logged or shown to the model; the model receives no observation or screenshot while the human holds the browser.

**Architecture:** `BrowserActionPolicy` returns denials with a `handoff` reason for password typing and for clicks on sign-in controls while a password field is visible; `browserExecutor` adds `hints` to observations (login form, CAPTCHA) so the model calls `request_human` early. Per-surface Take/Give buttons in the browser panel use the existing `lease.take { surface }`. agentd never logs `browser.input`.

## Global Constraints

- Handoff reasons: `password field needs your input`, `sign-in needs your credentials`, `CAPTCHA or verification needs you`.
- Observation hints: `login_form` (a `password` element is present), `captcha` (element name/text matches /captcha|not a robot|verify you are human|security check/i), `two_factor` (/verification code|one-time|2fa|authenticator/i).
- While the human holds the browser lease: `browser_*` tools → `LEASE_DENIED` (no observation, no screenshot), frames still flow to the UI, `browser.input` never appears in logs or the event log.

## Tasks

1. **Policy + hints**: `classifyBrowserAction` gains `{ kind: "handoff", reason }`; `BrowserActionPolicy` maps it to `{ allow: false, code: "LEASE_DENIED", reason, handoff }`; `browserExecutor` appends `hints` to the observation JSON. Tests.
2. **Daemon + UI**: do not log `browser.input`; BrowserPanel gets "Take control" / "Give back" for its own surface while a run is active; the handoff banner already covers the rest. Typecheck, tests, commit, merge.
3. **Acceptance with the user (X)**: Browser view → Open browser → navigate x.com → log in as the human → Give control back is not needed (no run yet) → goal "Open my X notifications and summarise the last five." Expected: agent navigates, observes, summarises; no approval. Second goal "Post a tweet saying hello" → an approval card for `send`; the user denies; the agent reports the refusal.
