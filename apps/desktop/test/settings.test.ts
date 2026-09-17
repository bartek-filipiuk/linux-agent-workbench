import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_SETTINGS, readSettings, writeSettings } from "../src/main/settings";

describe("settings", () => {
  it("defaults, round-trips and ignores garbage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-set-"));
    const file = path.join(dir, "settings.json");
    expect(readSettings(file)).toEqual(DEFAULT_SETTINGS);
    writeSettings(file, { lastWorkspace: "/x", networkMode: "none", nestedAutonomy: false, domainMode: "ask" });
    expect(readSettings(file)).toEqual({ lastWorkspace: "/x", networkMode: "none", nestedAutonomy: false, domainMode: "ask" });
    fs.writeFileSync(file, "{not json");
    expect(readSettings(file)).toEqual(DEFAULT_SETTINGS);
    fs.writeFileSync(file, JSON.stringify({ networkMode: "weird", lastWorkspace: 5, nestedAutonomy: "yes", domainMode: "maybe" }));
    expect(readSettings(file)).toEqual(DEFAULT_SETTINGS);
    // Settings written before these keys existed keep the autonomy default.
    fs.writeFileSync(file, JSON.stringify({ networkMode: "open", lastWorkspace: "/y" }));
    expect(readSettings(file)).toEqual({ ...DEFAULT_SETTINGS, lastWorkspace: "/y" });
  });
});

it("retains separate encrypted OpenRouter and Jev keys across settings updates", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "law-set-or-"));
  try {
    const file = path.join(dir, "settings.json");
    writeSettings(file, { ...DEFAULT_SETTINGS, openrouterKeyEncrypted: "encrypted-router", jevKeyEncrypted: "encrypted-jev" });
    writeSettings(file, { ...readSettings(file), networkMode: "none" });
    expect(readSettings(file)).toMatchObject({ openrouterKeyEncrypted: "encrypted-router", jevKeyEncrypted: "encrypted-jev", networkMode: "none" });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
