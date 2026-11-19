import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("./.env.e2e", import.meta.url));

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173";
const sessionCookie = process.env.E2E_SESSION_COOKIE;
const baseURLObject = new URL(baseURL);

const storageState = sessionCookie
  ? {
      cookies: [
        {
          name: "doc_analyzer_session",
          value: sessionCookie,
          domain: baseURLObject.hostname,
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: baseURLObject.protocol === "https:",
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    storageState,
    trace: "retain-on-failure",
  },
});
