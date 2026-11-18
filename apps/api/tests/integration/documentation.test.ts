import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { FastifyInstance } from "fastify";

import {
  setupIntegration,
  teardownIntegration,
} from "../helpers/setup-integration";

describe("API documentation", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupIntegration();
  });

  afterAll(async () => {
    await teardownIntegration();
  });

  it("should expose the Swagger UI", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documentation",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("swagger-ui");
  });

  it("should expose the OpenAPI specification", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documentation/json",
    });

    expect(response.statusCode).toBe(200);

    const specification = response.json();

    expect(specification.openapi).toBe("3.0.3");
    expect(specification.info.title).toBe("Doc Analyzer API");
    expect(specification.paths).toBeDefined();
  });

  it("should document all ten API operations", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documentation/json",
    });

    expect(response.statusCode).toBe(200);

    const specification = response.json();

    const operationCount = Object.values(
      specification.paths as Record<string, Record<string, unknown>>,
    ).reduce((total, path) => total + Object.keys(path).length, 0);

    expect(operationCount).toBe(10);
  });

  it("should document cookie-based session authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documentation/json",
    });

    expect(response.statusCode).toBe(200);

    const specification = response.json();

    expect(
      specification.components.securitySchemes.sessionCookie,
    ).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "doc_analyzer_session",
      description: expect.any(String),
    });
  });

  it("should identify protected endpoints", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documentation/json",
    });

    expect(response.statusCode).toBe(200);

    const specification = response.json();

    const protectedEndpoints = [
      ["get", "/me"],
      ["post", "/auth/logout"],
      ["post", "/documents"],
      ["post", "/documents/{id}/retry"],
      ["get", "/documents"],
      ["get", "/documents/{id}"],
      ["delete", "/documents/{id}"],
    ] as const;

    for (const [method, path] of protectedEndpoints) {
      expect(
        specification.paths[path][method].security,
        `${method.toUpperCase()} ${path} should require session authentication`,
      ).toContainEqual({
        sessionCookie: [],
      });
    }
  });
});
