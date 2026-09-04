import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readSettings, writeSettings } from "../src/main/settings";

describe("settings", () => {
  it("defaults, round-trips and ignores garbage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-set-"));
    const file = path.join(dir, "settings.json");
    expect(readSettings(file)).toEqual({ networkMode: "open" });
    writeSettings(file, { lastWorkspace: "/x", networkMode: "none" });
    expect(readSettings(file)).toEqual({ lastWorkspace: "/x", networkMode: "none" });
    fs.writeFileSync(file, "{not json");
    expect(readSettings(file)).toEqual({ networkMode: "open" });
    fs.writeFileSync(file, JSON.stringify({ networkMode: "weird", lastWorkspace: 5 }));
    expect(readSettings(file)).toEqual({ networkMode: "open" });
  });
});
