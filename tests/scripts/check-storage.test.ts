import { expect, it, vi } from "vitest";
// @ts-expect-error The maintenance CLI is a standalone Node module.
import { checkStorage } from "../../scripts/check-storage.mjs";

const free = (gb: number) => ({ bavail: BigInt(gb * 1e9), bsize: 1n });
function fixture(usage = "10000000000\t/storage\n") {
  const run = vi.fn((_file: string, args: string[]) => args[0] === "info" ? "/storage\n" : usage);
  return { run, statfs: vi.fn(() => free(8)), cwd: "/project" };
}
it("counts allocated storage rather than summing shared virtual image sizes", () => {
  const deps = fixture();
  expect(checkStorage("after-build", deps)).toContain("10.00 GB");
  expect(deps.run.mock.calls[1]![1]).toEqual(["unshare", "du", "-sx", "--block-size=1", "--", "/storage"]);
  expect(deps.statfs.mock.calls.map(c => c[0])).toEqual(["/project", "/storage"]);
});
it("refuses low space on either filesystem without rounding up", () => {
  for (const low of ["/project", "/storage"]) {
    const deps = { ...fixture(), statfs: (dir: string) => free(dir === low ? 4.9 : 8) };
    expect(() => checkStorage("before-build", deps)).toThrow(/need 5 GB/);
  }
});
it("fails closed on invalid measurement, command failure or excessive storage", () => {
  expect(() => checkStorage("after-build", fixture("unknown"))).toThrow(/Could not measure/);
  expect(() => checkStorage("after-build", fixture("15000000000\t/storage"))).toThrow(/limit 14 GB/);
  expect(() => checkStorage("after-build", { ...fixture(), run: () => { throw new Error("Podman unavailable"); } })).toThrow(/Podman unavailable/);
});
