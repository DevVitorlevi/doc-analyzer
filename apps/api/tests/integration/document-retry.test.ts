import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";
import { createFakeStorage } from "../helpers/fake-storage";
import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { loginAndGetCookie } from "../helpers/login";

const storageFake = createFakeStorage();
const analyzerFake = createFakeDocumentAnalyzer();

describe("POST /documents/:id/retry", () => {
  const { getApp } = useIntegrationDatabase({
    storage: storageFake.storage,
    documentAnalyzer: analyzerFake.analyzer,
  });

  beforeEach(() => {
    storageFake.reset();
    analyzerFake.reset();
  });

  async function createUser() {
    return getApp().prisma.user.create({
      data: {
        googleId: randomUUID(),
        email: `${randomUUID()}@example.com`,
        name: "Integration Test User",
      },
    });
  }

  async function createFailedDocument(userId: string) {
    return getApp().prisma.document.create({
      data: {
        userId,
        title: "Contrato",
        instruction: "Resuma o documento",
        analysis: null,
        status: "FAILED",
        errorCode: "AI_ERROR",
        errorMessage: "Falha anterior na análise.",
        s3Key: `${userId}/${randomUUID()}.txt`,
        originalName: "contrato.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        truncated: false,
      },
    });
  }

  it("rejects an unauthenticated request", async () => {
    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${randomUUID()}/retry`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("reprocesses a failed document without uploading it again", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createFailedDocument(user.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("Conteúdo do contrato para análise."),
      contentType: document.mimeType,
    });

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${document.id}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(document.id);
    expect(response.json().status).toBe("COMPLETED");
    expect(response.json().analysis).toBe(analyzerFake.defaultResponse);
    expect(response.json().errorCode).toBeNull();

    expect(analyzerFake.calls).toHaveLength(1);
    expect(analyzerFake.calls[0]).toMatchObject({
      instruction: document.instruction,
      text: "Conteúdo do contrato para análise.",
    });

    const updatedDocument = await getApp().prisma.document.findUnique({
      where: { id: document.id },
    });

    expect(updatedDocument?.status).toBe("COMPLETED");
    expect(updatedDocument?.analysis).toBe(analyzerFake.defaultResponse);
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("returns 404 when the document does not exist", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${randomUUID()}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when the document belongs to another user", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const anotherUser = await createUser();
    const document = await createFailedDocument(anotherUser.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("Conteúdo do contrato."),
      contentType: document.mimeType,
    });

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${document.id}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");

    const unchangedDocument = await getApp().prisma.document.findUnique({
      where: { id: document.id },
    });

    expect(unchangedDocument?.status).toBe("FAILED");
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("returns 409 when the document is not FAILED", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();

    const document = await getApp().prisma.document.create({
      data: {
        userId: user.id,
        title: "Contrato",
        instruction: "Resuma o documento",
        analysis: "Análise já concluída.",
        status: "COMPLETED",
        s3Key: `${user.id}/${randomUUID()}.txt`,
        originalName: "contrato.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
      },
    });

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${document.id}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("CONFLICT");
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("rejects an invalid document UUID", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "POST",
      url: "/documents/invalid-id/retry",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("keeps the document FAILED when storage retrieval fails", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createFailedDocument(user.id);

    storageFake.failures.get = true;

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${document.id}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("FAILED");
    expect(response.json().errorCode).toBe("STORAGE_ERROR");
    expect(analyzerFake.calls).toHaveLength(0);

    const updatedDocument = await getApp().prisma.document.findUnique({
      where: { id: document.id },
    });

    expect(updatedDocument?.status).toBe("FAILED");
    expect(updatedDocument?.errorCode).toBe("STORAGE_ERROR");
  });
});
