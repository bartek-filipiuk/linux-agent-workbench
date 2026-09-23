import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Playbooks, distillationPrompt, playbookPrompt, shouldDistill, slugFor } from "../src/orchestrator/playbooks.js";
import type { ToolCallRow } from "../src/storage/store.js";
import { tmpDir } from "./helpers/tmp.js";

const call = (i: number, status = "done"): ToolCallRow => ({ id: `t${i}`, run_id: "r", call_id: `c${i}`, name: "browser_act", input_json: JSON.stringify({ i, pad: "x".repeat(1000) }), status, output_json: "y".repeat(1000), started_at: i, ended_at: i, error_code: null } as ToolCallRow);

describe("Playbooks", () => {
  it("seeds shipped playbooks once, lists accepted before drafts, and moves drafts on accept", () => {
    const seed = tmpDir("law-pb-seed-");
    fs.writeFileSync(path.join(seed, "allegro-search.md"), "# Allegro search\nsteps\n");
    fs.writeFileSync(path.join(seed, "Bad Name.md"), "# nope\n");
    const pb = new Playbooks(path.join(tmpDir("law-pb-"), "playbooks"));
    pb.seed(seed);
    fs.writeFileSync(pb.path("allegro-search"), "# Allegro search (edited)\n");
    pb.seed(seed); // never overwrites the user's edit
    expect(pb.read("allegro-search")).toContain("edited");
    const slug = pb.writeDraft("allegro-search", "# Allegro again\n");
    expect(slug).toBe("allegro-search-2");
    expect(pb.list()).toEqual([{ slug: "allegro-search", name: "Allegro search (edited)", draft: false }, { slug: "allegro-search-2", name: "Allegro again", draft: true }]);
    expect(pb.read("allegro-search-2")).toBeUndefined();
    pb.accept("allegro-search-2");
    expect(pb.list().every(p => !p.draft)).toBe(true);
    pb.discard("allegro-search-2"); // discarding a non-draft is a no-op
    expect(pb.read("allegro-search-2")).toContain("Allegro again");
    expect(pb.read("../etc/passwd")).toBeUndefined();
    expect(() => pb.accept("../etc/passwd")).toThrow(/invalid/);
  });

  it("builds prompts within bounds", () => {
    expect(slugFor("Wyszukaj RTX 5090 i pokaż wyniki ofert!")).toBe("wyszukaj-rtx-5090-i-pokaz-wyniki-ofert");
    expect(slugFor("!!!")).toMatch(/^playbook-/);
    expect(playbookPrompt("  # X\nsteps ")).toMatch(/^Playbook for this task.*\n\n# X\nsteps$/s);
    expect(shouldDistill([call(1), call(2), call(3, "failed")])).toBe(false);
    expect(shouldDistill([call(1), call(2), call(3)])).toBe(true);
    const prompt = distillationPrompt("goal", Array.from({ length: 200 }, (_, i) => call(i)), "done");
    expect(prompt.length).toBeLessThan(70_000);
    expect(prompt).toContain("(trace truncated)");
    expect(prompt).toMatch(/^Task the agent was given:\ngoal/);
  });
});
