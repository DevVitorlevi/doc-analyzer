import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import { registerErrorHandler } from "@/shared/errors/error-handler";

describe("error handler", () => {
  const app = Fastify();

  registerErrorHandler(app);

  app.get("/app-error", async () => {
    throw new AppError("NOT_FOUND", "Documento não encontrado.", 404);
  });

  app.get("/boom", async () => {
    throw new Error("secret internal detail");
  });

  app.post("/json", async () => ({ ok: true }));

  afterEach(async () => {
    await app.ready();
  });

  it("serializes AppError in the standard format", async () => {
    const response = await app.inject({ method: "GET", url: "/app-error" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Documento não encontrado." },
    });
  });

  it("hides details of unexpected errors", async () => {
    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." },
    });
    expect(response.body).not.toContain("secret");
    expect(response.body).not.toContain("stack");
  });

  it("maps Fastify 4xx errors to VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/json",
      headers: { "content-type": "application/json" },
      payload: "{invalid",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Requisição inválida." },
    });
  });
});
