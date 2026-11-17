import Fastify, { type FastifyInstance } from "fastify";
import type { Env } from "@/config/env";
import { healthRoutes } from "@/modules/health/health-routes";
import { buildLoggerOptions } from "./shared/logger/logger";

export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(env.NODE_ENV === "test" ? "silent" : "info"),
  });

  await app.register(healthRoutes);

  return app;
}
