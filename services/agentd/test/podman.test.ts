import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PodmanRuntime, buildBrowserRunArgs, buildRunArgs, sessionIdFor, validateWorkspacePath } from "../src/runtime/podman.js";
import { ProtocolError } from "@law/protocol";

const spec = {
  sessionId: "0123456789abcdef",
  workspacePath: "/home/u/proj",
  runtimeDir: "/run/user/1000/linux-agent-workbench/0123456789abcdef",
  imageId: "sha256:deadbeef",
  networkMode: "open" as const,
};

describe("sessionIdFor / validateWorkspacePath", () => {
  it("derives a stable 16-hex id", () => {
    expect(sessionIdFor("/a/b")).toMatch(/^[a-f0-9]{16}$/);
    expect(sessionIdFor("/a/b")).toBe(sessionIdFor("/a/b"));
    expect(sessionIdFor("/a/b")).not.toBe(sessionIdFor("/a/c"));
  });
  it("rejects relative, root, home root and non-directories", () => {
    for (const p of ["rel", "/", os.homedir(), "/definitely/missing/dir"]) {
      expect(() => validateWorkspacePath(p), p).toThrow(ProtocolError);
    }
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "law-v-")), "file");
    fs.writeFileSync(f, "x");
    expect(() => validateWorkspacePath(f)).toThrow(ProtocolError);
  });
  it("returns the realpath of a directory", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "law-v-"));
    expect(validateWorkspacePath(d)).toBe(fs.realpathSync(d));
  });
});

describe("buildRunArgs", () => {
  it("produces the hardened argument array", () => {
    const args = buildRunArgs(spec);
    expect(args.slice(0, 3)).toEqual(["run", "-d", "--rm"]);
    expect(args).toContain("--name");
    expect(args[args.indexOf("--name") + 1]).toBe("law-terminal-0123456789abcdef");
    for (const flag of ["--userns=keep-id", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--read-only", "--pids-limit=512"]) {
      expect(args).toContain(flag);
    }
    expect(args).toContain("/home/u/proj:/workspace:rw");
    expect(args).toContain(`${spec.runtimeDir}:/run/law:rw`);
    expect(args).toContain("law-auth-claude:/home/agent/.claude");
    // No network namespace of its own; everything goes through the egress socket (B6 H1).
    expect(args[args.indexOf("--network") + 1]).toBe("none");
    expect(args).not.toContain("slirp4netns");
    expect(args).toContain("HTTPS_PROXY=http://127.0.0.1:3128");
    expect(args).toContain("LAW_EGRESS_SOCKET=/run/law/egress.sock");
    expect(args).toContain("CLAUDE_CONFIG_DIR=/home/agent/.claude");
    expect(args).toContain("law-ssh:/home/agent/.ssh");
    expect(args.join(" ")).not.toContain(".gitconfig");
    expect(buildRunArgs({ ...spec, gitconfigPath: "/home/u/.gitconfig" })).toContain("/home/u/.gitconfig:/home/agent/.gitconfig:ro");
    expect(() => buildRunArgs({ ...spec, gitconfigPath: "rel/.gitconfig" })).toThrow(ProtocolError);
    expect(args.at(-1)).toBe("sha256:deadbeef");
    expect(args.join(" ")).not.toMatch(/OPENAI|ANTHROPIC/);
  });
  it("uses --network none when requested and rejects bad ids", () => {
    expect(buildRunArgs({ ...spec, networkMode: "none" })).toContain("none");
    expect(() => buildRunArgs({ ...spec, sessionId: "../x" })).toThrow(ProtocolError);
    expect(() => buildRunArgs({ ...spec, workspacePath: "relative" })).toThrow(ProtocolError);
  });
});

describe("PodmanRuntime", () => {
  function fakeExec(states: Record<string, string>, calls: string[][], images: Record<string, string> = {}) {
    return async (args: string[]) => {
      calls.push(args);
      if (args[0] === "inspect") {
        const name = args.at(-1)!;
        if (!(name in states)) throw new Error("no such container");
        if (args.includes("{{.Image}}")) return { stdout: (images[name] ?? "sha256:deadbeef") + "\n", stderr: "" };
        return { stdout: states[name]! + "\n", stderr: "" };
      }
      if (args[0] === "run") return { stdout: "cid\n", stderr: "" };
      if (args[0] === "rm") return { stdout: "", stderr: "" };
      if (args[0] === "logs") return { stdout: "log lines", stderr: "" };
      if (args[0] === "image") return { stdout: "", stderr: "" };
      throw new Error(`unexpected ${args.join(" ")}`);
    };
  }

  it("reports state and reuses a running container", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({ "law-terminal-0123456789abcdef": "running" }, calls));
    expect(await rt.state(spec.sessionId)).toBe("running");
    expect(await rt.ensureRunning(spec)).toBe("reused");
    expect(calls.some((c) => c[0] === "run")).toBe(false);
  });

  it("removes a stopped container and starts a fresh one", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({ "law-terminal-0123456789abcdef": "exited" }, calls));
    expect(await rt.ensureRunning(spec)).toBe("started");
    expect(calls.map((c) => c[0])).toEqual(["inspect", "rm", "run"]);
  });

  it("recreates or reports a running container built from another image", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({ "law-terminal-0123456789abcdef": "running" }, calls, { "law-terminal-0123456789abcdef": "sha256:old" }));
    expect(await rt.ensureRunning(spec)).toBe("outdated");
    expect(calls.some((c) => c[0] === "run")).toBe(false);
    const rt2 = new PodmanRuntime(fakeExec({ "law-terminal-0123456789abcdef": "running" }, calls, { "law-terminal-0123456789abcdef": "sha256:old" }));
    expect(await rt2.ensureRunningWith("law-terminal-0123456789abcdef", ["run"], { imageId: "sha256:deadbeef", recreateOnImageMismatch: true })).toBe("started");
    expect(calls.slice(-2).map((c) => c[0])).toEqual(["rm", "run"]);
  });

  it("starts when missing and destroys idempotently", async () => {
    const calls: string[][] = [];
    const rt = new PodmanRuntime(fakeExec({}, calls));
    expect(await rt.state(spec.sessionId)).toBe("missing");
    expect(await rt.ensureRunning(spec)).toBe("started");
    await rt.destroy(spec.sessionId);
    expect(calls.at(-1)).toEqual(["rm", "-f", "--ignore", "law-terminal-0123456789abcdef"]);
  });
});

describe("buildBrowserRunArgs", () => {
  const bspec = { sessionId: "0123456789abcdef", runtimeDir: "/run/user/1000/law/0123456789abcdef/browser", downloadsDir: "/home/u/.local/share/law/downloads/0123456789abcdef", imageId: "sha256:beef", networkMode: "open" as const };
  it("isolates the browser: profile volume, downloads, socket dir, no workspace, no keys", () => {
    const args = buildBrowserRunArgs(bspec);
    expect(args[args.indexOf("--name") + 1]).toBe("law-browser-0123456789abcdef");
    for (const flag of ["--userns=keep-id", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--read-only", "--shm-size=1g"]) expect(args).toContain(flag);
    expect(args).toContain("law-browser-profile-default:/profile");
    expect(args).toContain(`${bspec.downloadsDir}:/downloads:rw`);
    expect(args).toContain(`${bspec.runtimeDir}:/run/law:rw`);
    expect(args.join(" ")).not.toMatch(/workspace|OPENAI|ANTHROPIC|law-auth/);
    expect(args.at(-1)).toBe("sha256:beef");
    expect(buildBrowserRunArgs({ ...bspec, networkMode: "none" })).toContain("none");
    expect(() => buildBrowserRunArgs({ ...bspec, sessionId: "x" })).toThrow();
  });
});
