import type { FastifyInstance } from "fastify";
import { buildApp } from "@/app";
import { loadEnv } from "@/config/env";
import { makeTestEnv } from "./fake-env";

let app: FastifyInstance | undefined;

export async function setupIntegration(): Promise<FastifyInstance> {
  app = await buildApp(loadEnv(makeTestEnv()));

  await app.ready();

  return app;
}

export async function teardownIntegration(): Promise<void> {
  if (app) {
    await app.close();
    app = undefined;
  }
}
