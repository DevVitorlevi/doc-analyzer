import { afterAll, beforeAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { resetTestDatabase } from "./reset-test-database";
import { setupIntegration, teardownIntegration } from "./setup-integration";

let app: FastifyInstance | undefined;

export function useIntegrationDatabase(): {
  getApp: () => FastifyInstance;
} {
  beforeAll(async () => {
    app = await setupIntegration();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await teardownIntegration();
    app = undefined;
  });

  return {
    getApp: () => {
      if (!app) {
        throw new Error("Integration app has not been initialized");
      }

      return app;
    },
  };
}
