import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { Env } from "@/config/env";
import { healthRoutes } from "@/modules/health/health-routes";
import { authRoutes } from "@/modules/auth/auth-routes";
import {
  createGoogleOAuthProvider,
  type GoogleOAuthProvider,
} from "@/modules/auth/google-oauth";
import { createPrismaClient } from "@/shared/database/prisma";
import { buildLoggerOptions } from "./shared/logger/logger";

export interface BuildAppOptions {
  googleOAuthProvider?: GoogleOAuthProvider;
}

export async function buildApp(
  env: Env,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(env.NODE_ENV === "test" ? "silent" : "info"),
  });

  const prisma = createPrismaClient(env.DATABASE_URL);

  app.decorate("prisma", prisma);
  app.decorateRequest("currentUser", null);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  const googleOAuthProvider =
    options.googleOAuthProvider ?? createGoogleOAuthProvider(env);

  app.decorate("googleOAuthProvider", googleOAuthProvider);

  await app.register(cookie);

  await app.register(cors, {
    origin: env.WEB_URL,
    credentials: true,
  });

  await app.register(authRoutes(env));
  await app.register(healthRoutes);

  return app;
}
