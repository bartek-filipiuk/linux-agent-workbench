# Follow-up task: earlier conversations

Status: deferred; not part of browser recovery and current-conversation follow-ups.

The current implementation persists conversation IDs, parent runs, provider checkpoints, messages and per-run snapshots. Reopening a workspace restores its latest conversation without starting work. Existing Recent tasks remains a run-level results view.

Decide before implementation:

- Navigation: a dedicated Sessions tab or a sidebar within the task panel.
- Scope: conversations in the open workspace, or a workspace-grouped global list.
- Reopening: continue the same conversation by default; offer branching separately if needed.
- Retention: how conversation deletion/archive interacts with SQLite retention, durable Codex files and workspace files.
- Recovery: display missing workspace/provider history and changed model/tool availability without silently creating a new conversation.

Acceptance: list and load history in bounded pages; never start an agent on selection; preserve drafts per conversation; enforce workspace and provider ownership; show outcomes and output paths; prevent simultaneous control of the same browser/terminal; test app restarts and stale selections.
