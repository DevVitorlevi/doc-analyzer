import type { FastifyInstance } from "fastify";

import { buildApp, type BuildAppOptions } from "@/app";
import { loadEnv, type Env } from "@/config/env";

import {
  assertIntegrationDatabase,
  assertTestDatabase,
} from "./assert-test-database";
import { makeTestEnv } from "./fake-env";
import { createFakeGoogleOAuthProvider } from "./fake-google-oauth";

let app: FastifyInstance | undefined;

export function createIntegrationEnv(): Env {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  assertTestDatabase(testDatabaseUrl);

  const env = loadEnv(
    makeTestEnv({
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
    }),
  );

  assertIntegrationDatabase(env.DATABASE_URL, env.TEST_DATABASE_URL);

  return env;
}

export async function setupIntegration(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const env = createIntegrationEnv();

  app = await buildApp(env, {
    googleOAuthProvider: createFakeGoogleOAuthProvider(),
    ...options,
  });

  await app.ready();

  return app;
}

export async function teardownIntegration(): Promise<void> {
  if (app) {
    await app.close();
    app = undefined;
  }
}
