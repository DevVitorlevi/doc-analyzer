import type { FastifyInstance } from "fastify";
import { buildApp, type BuildAppOptions } from "@/app";
import { loadEnv } from "@/config/env";
import { makeTestEnv } from "./fake-env";
import { createFakeGoogleOAuthProvider } from "./fake-google-oauth";

let app: FastifyInstance | undefined;

export async function setupIntegration(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  app = await buildApp(loadEnv(makeTestEnv()), {
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
