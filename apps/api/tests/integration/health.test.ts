import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "@/app";
import { loadEnv } from "@/config/env";
import { makeTestEnv } from "../helpers/fake-env";

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(loadEnv(makeTestEnv()));
  });

  afterEach(async () => {
    await app.close();
  });

  it("responds 200 with status ok without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ status: string }>()).toEqual({ status: "ok" });
  });
});
