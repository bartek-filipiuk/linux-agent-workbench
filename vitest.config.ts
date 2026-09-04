import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@law/protocol/node": r("./packages/protocol/src/node/index.ts"),
      "@law/protocol": r("./packages/protocol/src/index.ts"),
      "@law/agentd": r("./services/agentd/src/index.ts"),
      "@law/terminal-worker": r("./services/terminal-worker/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/test/**/*.test.ts", "services/**/test/**/*.test.ts", "apps/**/test/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 10_000,
    passWithNoTests: true,
  },
});
