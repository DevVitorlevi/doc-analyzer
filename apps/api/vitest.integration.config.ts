import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "integration",
    root: apiRoot,
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    env: {
      NODE_ENV: "test",
    },
    globalSetup: ["./tests/setup/global-setup.ts"],
  },
});
