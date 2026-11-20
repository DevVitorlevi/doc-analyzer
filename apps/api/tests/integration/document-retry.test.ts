import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { AiAnalysisError } from "@/integrations/openai/ai-analysis-error";

import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";
import { createFakeStorage } from "../helpers/fake-storage";
import { makePdf } from "../helpers/document-fixtures";
import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { loginAndGetCookie } from "../helpers/login";
import { runAnalysisWorker } from "../helpers/run-analysis-worker";

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

  async function runWorker(): Promise<void> {
    await runAnalysisWorker(getApp(), {
      storage: storageFake.storage,
      analyzer: analyzerFake.analyzer,
    });
  }

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

  it("queues a failed document for reprocessing without uploading it again", async () => {
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
    expect(response.json()).toMatchObject({
      id: document.id,
      status: "PROCESSING",
      analysis: null,
      errorCode: null,
    });
    expect(analyzerFake.calls).toHaveLength(0);

    await runWorker();

    expect(analyzerFake.calls).toHaveLength(1);
    expect(analyzerFake.calls[0]).toMatchObject({
      instruction: document.instruction,
      text: "Conteúdo do contrato para análise.",
    });

    const updatedDocument = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });

    expect(updatedDocument).toMatchObject({
      status: "COMPLETED",
      analysis: analyzerFake.defaultResponse,
      errorCode: null,
    });
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

  it("returns 409 when the document is COMPLETED", async () => {
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

  it("returns 409 when the document is already PROCESSING", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createFailedDocument(user.id);

    await getApp().prisma.document.update({
      where: { id: document.id },
      data: {
        status: "PROCESSING",
        errorCode: null,
        errorMessage: null,
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

  it("keeps the document PROCESSING and reschedules it when storage retrieval fails", async () => {
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
    expect(response.json().status).toBe("PROCESSING");

    await runWorker();

    expect(analyzerFake.calls).toHaveLength(0);

    const updatedDocument = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });

    expect(updatedDocument.status).toBe("PROCESSING");
    expect(updatedDocument.errorCode).toBeNull();
    expect(updatedDocument.analysisLeaseUntil).toBeNull();
    expect(updatedDocument.analysisError).toEqual(expect.any(String));
    expect(updatedDocument.analysisNextAttemptAt.getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it("keeps the document FAILED when the analysis fails again", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createFailedDocument(user.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("Conteúdo para análise."),
      contentType: document.mimeType,
    });

    analyzerFake.failWith(new AiAnalysisError("AI_TIMEOUT"));

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${document.id}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: document.id,
      status: "PROCESSING",
      errorCode: null,
      analysis: null,
    });

    await runWorker();

    const updatedDocument = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });

    expect(updatedDocument).toMatchObject({
      status: "FAILED",
      errorCode: "AI_TIMEOUT",
      analysis: null,
    });
    expect(analyzerFake.calls).toHaveLength(1);
  });

  it("marks an unreadable PDF as FAILED without calling the AI", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();

    const document = await getApp().prisma.document.create({
      data: {
        userId: user.id,
        title: "PDF escaneado",
        instruction: "Resuma o documento",
        analysis: null,
        status: "FAILED",
        errorCode: "AI_ERROR",
        errorMessage: "Falha anterior.",
        s3Key: `${user.id}/${randomUUID()}.pdf`,
        originalName: "escaneado.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        truncated: false,
      },
    });

    storageFake.objects.set(document.s3Key, {
      body: makePdf([[]]),
      contentType: "application/pdf",
    });

    const response = await getApp().inject({
      method: "POST",
      url: `/documents/${document.id}/retry`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: document.id,
      status: "PROCESSING",
      errorCode: null,
    });

    await runWorker();

    const updatedDocument = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });

    expect(updatedDocument).toMatchObject({
      status: "FAILED",
      errorCode: "UNREADABLE_FILE",
    });
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("allows only one concurrent retry to queue the document", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createFailedDocument(user.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("Conteúdo do contrato."),
      contentType: document.mimeType,
    });

    const [first, second] = await Promise.all([
      getApp().inject({
        method: "POST",
        url: `/documents/${document.id}/retry`,
        headers: { cookie },
      }),
      getApp().inject({
        method: "POST",
        url: `/documents/${document.id}/retry`,
        headers: { cookie },
      }),
    ]);

    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);

    const rejected = first.statusCode === 409 ? first : second;

    expect(rejected.json().error.code).toBe("CONFLICT");
    expect(analyzerFake.calls).toHaveLength(0);

    await runWorker();

    expect(analyzerFake.calls).toHaveLength(1);

    const updatedDocument = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });

    expect(updatedDocument.status).toBe("COMPLETED");
  });
});
