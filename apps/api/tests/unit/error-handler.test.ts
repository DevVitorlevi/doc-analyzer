import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import { registerErrorHandler } from "@/shared/errors/error-handler";

describe("error handler", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = Fastify({
      logger: false,
    });

    registerErrorHandler(app);

    app.get("/app-error", async () => {
      throw new AppError("NOT_FOUND", "Documento não encontrado.", 404);
    });

    app.get("/boom", async () => {
      throw new Error("secret internal detail");
    });

    app.post("/json", async () => ({ ok: true }));

    app.post(
      "/validated",
      {
        schema: {
          body: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string" },
            },
          },
        },
      },
      async () => ({ ok: true }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it("serializes AppError in the standard format", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/app-error",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Documento não encontrado.",
      },
    });
  });

  it("hides details of unexpected errors", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/boom",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor.",
      },
    });

    expect(response.body).not.toContain("secret");
    expect(response.body).not.toContain("stack");
  });

  it("maps malformed JSON to VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/json",
      headers: {
        "content-type": "application/json",
      },
      payload: "{invalid",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Requisição inválida.",
      },
    });
  });

  it("maps schema validation errors to VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validated",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Requisição inválida.",
      },
    });
  });

  it("returns the standard response for unknown routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/does-not-exist",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Rota não encontrada.",
      },
    });
  });
});
