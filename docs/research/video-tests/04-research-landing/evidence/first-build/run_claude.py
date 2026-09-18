import subprocess
import time
import json
from datetime import datetime, timezone

start_time = datetime.now(timezone.utc).isoformat()
start_perf = time.perf_counter()

cmd = (
    "claude -p "
    "--model claude-sonnet-5 "
    "--effort medium "
    "--permission-mode acceptEdits "
    "--allowedTools 'Read,Write,Edit,Bash' "
    "--tools 'Read,Write,Edit,Bash' "
    "--max-turns 24 "
    "--max-budget-usd 4 "
    "--output-format json "
    "'Read research.md and design-brief.md. Build the complete landing page in this workspace. Use the supplied local fonts. Do not spawn agents. Write build-notes.md with actual validation and limitations.' "
    "> claude-result.json 2> claude-stderr.log"
)

proc = subprocess.run(cmd, shell=True)
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

with open("build-timing.json", "w") as tf:
    json.dump(timing_data, tf, indent=2)

with open("claude_run_status.txt", "w") as f:
    f.write(f"ALL_COMPLETED exit_code={exit_code} elapsed={elapsed_seconds:.2f}\n")
