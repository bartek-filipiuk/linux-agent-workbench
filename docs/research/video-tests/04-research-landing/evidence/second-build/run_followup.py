import subprocess
import time
import json
from datetime import datetime, timezone

start_time = datetime.now(timezone.utc).isoformat()
start_perf = time.perf_counter()

prompt = (
    "Read research.md and build-notes.md. "
    "Keep the existing page and make only these fixes: "
    "remove all eyebrow/kicker paragraphs above headings; "
    "make the hero CTA content-width on desktop; "
    "replace the unsupported absolute 'lost instantly under white light' with cautious wording about bright white light disrupting dark adaptation; "
    "replace the unsupported exact 'at least twenty minutes' in the checklist with 'Give your eyes time to adjust to the dark'. "
    "Do not add facts or sources. "
    "Keep the 4 bibliography links, slider, checklist, responsive CSS and local fonts. "
    "Run node --check script.js and finish with a concise truthful result, avoiding redundant testing. "
    "Update build-notes.md to disclose this external review, previous turn-limit failure and actual corrections. "
    "Do not spawn agents."
)

cmd = [
    "claude",
    "--dangerously-skip-permissions",
    "-p",
    "--model", "claude-sonnet-5",
    "--effort", "medium",
    "--permission-mode", "acceptEdits",
    "--allowedTools", "Read,Write,Edit,Bash",
    "--tools", "Read,Write,Edit,Bash",
    "--max-turns", "16",
    "--max-budget-usd", "2",
    "--output-format", "json",
    prompt
]

with open("claude-followup.json", "w") as out_f, open("claude-followup-stderr.log", "w") as err_f:
    proc = subprocess.run(cmd, stdout=out_f, stderr=err_f)
    exit_code = proc.returncode

end_perf = time.perf_counter()
end_time = datetime.now(timezone.utc).isoformat()
elapsed_seconds = end_perf - start_perf

timing_data = {
    "start_time": start_time,
    "end_time": end_time,
    "elapsed_seconds": elapsed_seconds,
    "exit_code": exit_code
}

with open("followup-timing.json", "w") as tf:
    json.dump(timing_data, tf, indent=2)

print(f"AFTER_DARK_DONE_EXIT_{exit_code}")
