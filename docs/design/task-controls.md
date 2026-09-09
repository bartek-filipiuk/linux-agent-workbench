---
name: Operate task controls
description: Built task preparation and limit-pause surface within the existing desktop workspace.
colors:
  bg: "#0e1116"
  panel: "#171c23"
  fg: "#e6e8eb"
  muted: "#a1aab6"
  agent: "#92b9ff"
  border: "#303944"
  control: "#232b35"
  danger: "#f28b82"
  warn: "#e4bb78"
typography:
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.5
  title:
    fontSize: "16px"
    fontWeight: 650
  label:
    fontSize: "12px"
    fontWeight: 600
  help:
    fontSize: "12px"
    lineHeight: 1.5
rounded:
  control: "4px"
  panel: "8px"
spacing:
  compact: "8px"
  field: "12px"
  section: "16px"
---

# Operate task controls

## Overview

This is a bounded record of the built task preparation and limit-pause UI, preserving the incumbent dark, practical workspace. It is not a whole-app design system or a new product identity. No root `PRODUCT.md` or `DESIGN.md` was present for this pass.

Source authority: [renderer styles](../../apps/desktop/src/renderer/styles.css), [TaskComposer](../../apps/desktop/src/renderer/TaskComposer.tsx), [task settings](../../apps/desktop/src/renderer/task-settings.ts), [RunDrawer](../../apps/desktop/src/renderer/RunDrawer.tsx), [BudgetPause](../../apps/desktop/src/renderer/BudgetPause.tsx), [PanelLayout](../../apps/desktop/src/renderer/PanelLayout.tsx), and [BrowserPanel](../../apps/desktop/src/renderer/BrowserPanel.tsx). Runtime semantics are documented in [Codex integration](../codex-integration.md#task-preparation-and-resumable-limits--2026-09-09); implementation status is in [TODO](../../TODO.md).

The surface was reviewed at 1400×900 and 1024×768. Local screenshots and account-specific review evidence are excluded from the public repository. Runtime behavior and security limits are documented separately; visual review does not establish backend correctness.

## Colors

Graphite backgrounds and lighter panel/control surfaces retain the incumbent hierarchy. Pale blue marks the primary action and keyboard focus; muted text supports labels and explanations. Amber identifies a reached limit, while error copy uses the danger color. Neutral borders separate fields and sections without decoration.

## Typography

Use the incumbent system sans-serif for controls. The modest ramp moves from help and labels to body text and a compact panel title. Goal text inherits body size with slightly more line spacing (1.55). Character counts use tabular numerals. Monospace remains in existing code, terminal, and path content; this surface adds no display face.

## Layout

**The Reachable Start Rule.** In the reviewed desktop layouts, task settings scroll inside their own region while the full-width Start action and effective-limit summary remain in a non-scrolling footer.

The task drawer starts at a preferred width of 460px, with a saved 320–600px resize preference and an available-width cap. Pointer dragging and keyboard arrows/Home/End adjust it. New task and History & results are separate panel views.

The goal begins at 180px and grows to 300px in the ordinary drawer or 480px when expanded. Expanded editing hides previews and the splitter, centers the drawer at up to 960px, and retains the Start footer. Back to preview or Escape restores the ordinary layout. Preview visibility suppresses browser streaming without unmounting the terminal.

Steps and active time occupy two equal columns. Short desktop windows require scrolling to lower settings. The existing narrow-window fallback below 760px wraps the editor heading and gives composition a 650px minimum height; it was not covered by the supplied desktop captures.

## Elevation & Depth

This surface uses tonal layering and single-pixel borders, with no added shadows or entrance motion. Keyboard focus uses the incumbent blue two-pixel outline; controls remain identifiable without hover.

## Shapes

Small rounded rectangles carry inputs and buttons; the surrounding drawer retains the larger panel corners. A bordered amber pause block distinguishes the temporary state without replacing the workspace layout.

## Components

- **Goal editor:** labelled textarea, visible 4,000-character counter, and a warning when pasted content would exceed the cap. Drafts are workspace-specific. Writes are debounced by 300ms and flushed on lifecycle boundaries; storage failure is reported visibly.
- **Working style:** General, Research & data, and Build with a coding agent have persistent plain-language descriptions. Compare working styles expands the full legend. The coding-agent option explicitly names its separate setup/sign-in requirement. Model & reasoning remains a separate disclosure.
- **Limits:** default to No step limit and 30 minutes active time. No time limit is independent. Custom values remain editable strings; validation blocks start for invalid values rather than clamping keystrokes. Style and limits persist under `law.task-preferences`. The footer displays effective steps/tools and time.
- **Start:** full-width pale-blue primary button; disabled for missing goal, unavailable workspace/model, invalid limits, or a pending start. Submission changes the label to Starting… and locks editable fields. Errors use an alert.
- **Limit pause:** states that context is saved in this session and presents reason-specific actions: add/remove a step or time cap, or add API spending allowance. It exposes the unaffected time limit or explains that step/spending limits remain unchanged. Pending requests disable repeated clicks; workspace/manual-login restrictions remain visible. This UI does not promise restoration of an active run after a full application restart.

## Do's and Don'ts

- **Do** preserve the incumbent palette, compact labels, generous goal area, and reachable primary action.
- **Do** keep style, model/effort, and limits separately understandable, and show effective limits before starting.
- **Do** describe continuation as belonging to the same live session and keep backend validation distinct from synthetic UI evidence.
- **Don't** promote these task-specific layouts into whole-app rules, introduce a new visual identity, or infer new product guarantees from review screenshots.

No whole-app sidecar was generated: this scoped surface record does not regenerate root `DESIGN.md`.
