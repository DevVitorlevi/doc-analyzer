import { describe, expect, it } from "vitest";
import type { Document as DocumentRecord } from "@prisma/client";
import {
  createDocumentFieldsSchema,
  toDocumentResponse,
} from "@/modules/documents/documents-schemas";

describe("createDocumentFieldsSchema", () => {
  it("accepts and trims valid fields", () => {
    const result = createDocumentFieldsSchema.safeParse({
      title: "  Contrato  ",
      instruction: " Resuma ",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({ title: "Contrato", instruction: "Resuma" });
    }
  });

  it("rejects missing or blank fields", () => {
    expect(createDocumentFieldsSchema.safeParse({}).success).toBe(false);

    expect(
      createDocumentFieldsSchema.safeParse({ title: "   ", instruction: "x" })
        .success,
    ).toBe(false);

    expect(
      createDocumentFieldsSchema.safeParse({ title: "x", instruction: "" })
        .success,
    ).toBe(false);
  });

  it("enforces the 120 and 2000 character limits", () => {
    expect(
      createDocumentFieldsSchema.safeParse({
        title: "a".repeat(120),
        instruction: "b".repeat(2000),
      }).success,
    ).toBe(true);

    expect(
      createDocumentFieldsSchema.safeParse({
        title: "a".repeat(121),
        instruction: "x",
      }).success,
    ).toBe(false);

    expect(
      createDocumentFieldsSchema.safeParse({
        title: "x",
        instruction: "b".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("returns Portuguese messages", () => {
    const result = createDocumentFieldsSchema.safeParse({
      instruction: "x",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("O título é obrigatório.");
    }
  });
});

describe("toDocumentResponse", () => {
  it("does not expose the storage key or the owner id", () => {
    const now = new Date("2026-11-17T12:00:00.000Z");

    const record: DocumentRecord = {
      id: "doc-id",
      userId: "user-id",
      title: "Título",
      instruction: "Instrução",
      analysis: "Análise",
      status: "COMPLETED",
      errorCode: null,
      errorMessage: null,
      truncated: false,
      s3Key: "user-id/doc-id.txt",
      originalName: "arquivo.txt",
      mimeType: "text/plain",
      sizeBytes: 10,
      createdAt: now,
      updatedAt: now,
    };

    const response = toDocumentResponse(record);

    expect(response).not.toHaveProperty("s3Key");
    expect(response).not.toHaveProperty("userId");
    expect(response.createdAt).toBe("2026-11-17T12:00:00.000Z");
    expect(response.status).toBe("COMPLETED");
  });
});
