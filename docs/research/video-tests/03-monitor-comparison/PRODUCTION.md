# A longer task, including a failed first result

This is the third recorded Linux Agent Workbench experiment. It compares Uptime Kuma, Gatus and Tianji for a three-person team operating 12 HTTP services and three TCP endpoints on a Linux Docker host, with Slack alerts, a public status page and a preference for configuration stored in Git.

**The initial autonomous attempt failed acceptance checks.** A reviewer supplied explicit corrective feedback, after which the application produced corrected artifacts. The film retains both phases and does not present the result as an autonomous first-pass success.

## Watch and inspect

- `output/linux-agent-long-test.mp4`: 3:08 editorial film, 1920 × 1080, 30 fps, English captions and quiet original audio under title cards. Both task sections are shown in full at **2×**, explicitly labeled, with clocks showing actual task time.
- `public/capture.mp4`: full original recording at **1×**.
- `public/recovery.mp4`: full follow-up recording at **1×**.
- `output/thumbnail.png`, `output/english.srt`: cover and optional subtitles.
- `output/candidates.csv`, `output/decision.md`, `output/score-check.json`: corrected deliverables.
- `evidence/original-output/`: untouched first-attempt files, including the failed score check.
- `evidence/task.txt`, `evidence/recovery-task.txt`: exact instructions.
- `evidence/run.json`, `evidence/recovery.json`: timestamped UI/tool events and final app responses.
- `evidence/independent-check.json`: independent schema, arithmetic, release, license and format checks.
- `evidence/phase-metrics.json`: timing, routing and cost accounting from the app database.

## Measurements

Gemini `google/gemini-3.8-flash`, low reasoning, through OpenRouter / Google AI Studio; browser mode Jev Auto. Neither phase called Jev: Auto selected planned browser tools and direct Gemini reasoning.

| Measurement | Original task | Prompted correction | Total |
| --- | ---: | ---: | ---: |
| Task time, click → completed event | 179.060 s | 93.196 s | 272.256 s |
| Primary-model calls | 42 | 21 additional | 63 |
| Recorded model-request time | 137.529 s | 68.491 s | 206.020 s |
| Tool calls, app accounting | 110 | 41 additional | 151 |
| Known provider cost | $0.654741675 | $0.488558025 additional | $1.143299700 |
| Jev decisions | 0 | 0 | 0 |
| Acceptance result | **FAIL** | Checks pass after explicit feedback | **Assisted recovery** |

Setup, prompt entry, pauses between phases, external review and video production are excluded from task time. The follow-up UI carries cumulative counters and cost from the original conversation; its $1.143299700 reading is already the total, not an additional charge. Model-request time includes provider response waiting; the remaining task time includes browser operations, tool orchestration and other overhead. This is one complex demonstration, not a latency or reliability benchmark.

## What failed

1. The CSV and report assigned Uptime Kuma **70** points even though the stated weights sum to **80**. The generated Python validator detected this and wrote `validation_passed: false`. The model read that file and still finished with the incorrect score.
2. The first report used `no` for missing configuration-as-code evidence, despite the task explicitly requiring `unknown` for missing evidence.
3. It excluded Tianji for lacking a native Slack provider. The request required Slack delivery, not a native provider; the project's Apprise integration supplies a supported route.
4. The Gatus date was initially reported as May 20 without a timezone. Follow-up normalized dates to explicit UTC publication dates; the official timestamp is May 19 at 23:53 UTC.

The initial validator emitted JSON failure but exited normally; the generic terminal tool therefore reported command completion. The application has no mandatory task-specific completion gate for that arbitrary JSON file. Generating a check is insufficient if the planner ignores its result. This experiment demonstrates that limitation; it does not establish its frequency or prove a cause unique to Jev Auto.

## What the follow-up changed

The review prompt explicitly asked the agent to read its failed validator, correct all reports, recheck Tianji's integration, replace unsupported negatives with unknowns, normalize release timestamps, and read the saved files again. The correction was requested by the supervising assistant; it was not spontaneous agent self-recovery.

| Product | Original score | Corrected score | Qualification after correction |
| --- | ---: | ---: | --- |
| Gatus | 100 | 100 | Yes |
| Uptime Kuma | 70 | 80 | Yes |
| Tianji | 65 | 80 | Yes, with Slack through Apprise |

Gatus remains the highest-scoring candidate under the requested weights. Configuration as code stays `unknown` for Uptime Kuma and Tianji; that means evidence was not established in this review, not that every possible integration is absent.

The corrected decision has 644 whitespace-separated words, three CSV rows with the requested columns, source URLs and a five-step proposed rollout checklist. No monitor was deployed, no integration credentials were entered, and no notification was sent.

## Independent verification and limits

`scripts/verify.py` independently parses the final CSV, checks its schema and allowed values, recomputes weighted scores and eligibility, checks all three latest release versions/dates/license identifiers against separately fetched official GitHub metadata, and checks report length, links and the five-step checklist. It confirms the final agent-written validator says true. Feature review additionally used the official repositories and upstream integration sources:

- [Uptime Kuma repository](https://github.com/louislam/uptime-kuma): documented Docker setup, HTTP/TCP monitoring, Slack notifications and status pages.
- [Gatus README](https://github.com/TwiN/gatus/blob/master/README.md): Docker, checks, Slack, status UI and YAML configuration.
- [Tianji TCP implementation](https://github.com/msgbyte/tianji/blob/master/src/server/model/monitor/provider/tcp.ts), [HTTP implementation](https://github.com/msgbyte/tianji/blob/master/src/server/model/monitor/provider/http.ts), and [public status-page documentation](https://github.com/msgbyte/tianji/blob/master/website/docs/server-status/server-status-page.md).
- [Tianji Apprise provider](https://github.com/msgbyte/tianji/blob/master/src/server/model/notification/provider/apprise.ts) and [Dockerfile](https://github.com/msgbyte/tianji/blob/master/Dockerfile): the app calls Apprise and the official image installs it. [Apprise's Slack documentation](https://github.com/caronc/apprise/wiki/Notify_slack) establishes Slack transport support. Actual end-to-end delivery was not tested.

This checks the main decision inputs and artifact consistency. It is not a deployment, performance, security or legal review of those products. “Checks pass” in the film refers to this recorded validation scope, not a guarantee that every sentence or future deployment is correct.

## Reproduce the video

Node.js 24 and npm:

```bash
npm ci
npm run typecheck
npm run render
npx remotion still src/index.tsx LongTest output/thumbnail.png --frame=105
npm run studio
```

The included footage is enough to re-render without spending provider quota. Animations use the Remotion frame clock. Fonts are Outfit and DM Sans, bundled with their OFL notices. The sound bed is original, deterministically generated by `scripts/sound.py`, and silent during recorded task sections.

To regenerate derived data locally, the capture-time app workspace is expected at `~/linux-agent-tutorial-long-workspace`. Preserve the original evidence before rerunning any script. `scripts/verify.py`, `scripts/prepare.py` and `scripts/sound.py` use Python; the audio script requires NumPy. Archived source files and GitHub metadata are retained under `evidence/independent-sources/`.

The capture scripts run a real, paid app session against an isolated private `tutorial-long` profile and X11 display `:99`. `capture.mjs` submits the initial task; `recover.mjs` continues its durable conversation. They only enter the request, press Start/Continue and switch the visible Browser/Terminal tab to follow tool activity. They do not produce task results themselves. No keys are bundled. The app's source and the previous films remain unchanged. Nothing was uploaded or published.
