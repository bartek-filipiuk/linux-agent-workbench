# OpenRouter in the Jev experiment

The experimental branch supports an explicitly selected OpenRouter provider behind the existing desktop UI, RunController, tool policy, browser sandbox and Stop control. Classic and Jev First use the same selected primary model. The default provider in source remains Codex.

Configure the private file `~/.config/linux-agent-workbench-jev/.env`:

```dotenv
LAW_PROVIDER=openrouter
OPENROUTER_MODEL=google/gemini-3.8-flash
OPENROUTER_EFFORT=low
OPENROUTER_PROVIDER=google-ai-studio
# Add OPENROUTER_API_KEY privately here once. The desktop migrates it to the OS keyring.
```

Run `nvm use && pnpm dev:jev`. The model/effort summary shows the API configuration; API selection is host-configured, while the engine selector still switches between Classic, Hybrid and First. Set `LAW_PROVIDER=codex` and restart to return to the subscription provider. Provider changes require a new task; existing conversations retain their original provider.

`OPENROUTER_PROVIDER` pins an upstream and disables automatic upstream failover. Omit it for latency-sorted routing. Do not assume that a provider's advertised first-token latency equals the full time to a validated tool call. This implementation uses non-streaming requests and records time to HTTP headers and full response, not TTFT.

The adapter retains assistant messages, tool IDs and opaque reasoning/signature data for subsequent calls. The private database stores continuation context so a resumed task receives completed and uncertain tool results without replaying actions. Screenshots are excluded from persisted context; the model must re-observe. Context compaction starts a fresh conversation. Keys stay in the host process and daemon and are never sent to the renderer or browser worker. A strong Electron safeStorage backend encrypts the key; if unavailable, the private environment file remains the fallback. Error bodies are never copied into diagnostics.

API-reported `usage.cost` feeds the existing spending limit (including reasoning/cache billing), independently of Jev's estimated charge. Failed or interrupted requests can still be billed without returning usage; reported cost is not an invoice. Each HTTP attempt has a 60-second timeout, with at most two attempts and cancellable backoff; only model requests are retried, never browser mutations.

## Reproducible comparison

```sh
pnpm build
node scripts/bench-jev.mjs --runs 3 \
  --variants jev-first:gpt-5.6-luna,jev-first:google/gemini-3.8-flash,classic:google/gemini-3.8-flash \
  --output /tmp/jev-openrouter-local.json
node scripts/bench-jev.mjs --runs 3 --scenario google-flights \
  --variants jev-first:gpt-5.6-luna,jev-first:google/gemini-3.8-flash,classic:google/gemini-3.8-flash \
  --output /tmp/jev-openrouter-flights.json
node scripts/bench-jev-report.mjs /tmp/jev-openrouter-local.json
```

Variants rotate across scenario/repetition. A fresh browser profile is used for each attempt. Local fixtures have fixture-only egress. The live Flights scenario has no terminal, denies approval requests, and stops at search results without selecting or booking flights. Its independent verifier checks route, date/year, ticket type, passenger count, economy class and actual result rows. Consent rejection, initial navigation and initial observation are setup time; final verification is included in task time, screenshots are outside it. Setup failures remain in the report. API-model names contain a provider prefix (`google/...`); unprefixed names use Codex. `--verbose` prints timing/status only.

The reference [Jev Ultrafast Flights demo](https://github.com/browser-use/jev-ultrafast/blob/main/docs/performance.md) uses Jev with Mercury as a text helper, an existing Chrome profile and a different timing boundary. Our result is not a matched head-to-head comparison with its 7.073 seconds.
