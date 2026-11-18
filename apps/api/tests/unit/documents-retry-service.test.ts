import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentService } from "@/modules/documents/documents-service";

import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";

import { createFakeDocumentRepository } from "../helpers/fake-document-repository";

import { createFakeStorage } from "../helpers/fake-storage";

const storageFake = createFakeStorage();
const analyzerFake = createFakeDocumentAnalyzer();

function makeService() {
  const repositoryFake = createFakeDocumentRepository();

  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
  };

  const service = createDocumentService({
    documents: repositoryFake.repository,
    storage: storageFake.storage,
    analyzer: analyzerFake.analyzer,
    logger,
    maxTextChars: 60_000,
    maxFileSizeBytes: 10 * 1024 * 1024,
  });

  return { service, repositoryFake, logger };
}

async function createFailedDocument(
  repository: ReturnType<typeof createFakeDocumentRepository>["repository"],
  input: {
    id: string;
    userId: string;
    mimeType?: string;
  },
) {
  const document = await repository.create({
    id: input.id,
    userId: input.userId,
    title: "Contrato",
    instruction: "Resuma o documento",
    s3Key: `${input.userId}/${input.id}.txt`,
    originalName: "contrato.txt",
    mimeType: input.mimeType ?? "text/plain",
    sizeBytes: 100,
  });

  return repository.markFailed(document.id, document.userId, {
    errorCode: "AI_ERROR",
    errorMessage: "Falha anterior na análise.",
    truncated: false,
  });
}

describe("Document retry service", () => {
  beforeEach(() => {
    storageFake.reset();
    analyzerFake.reset();
  });

  it("retrieves the stored file and completes the analysis", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("Conteúdo do contrato para análise."),
      contentType: document.mimeType,
    });

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("COMPLETED");
    expect(result.analysis).toBe(analyzerFake.defaultResponse);
    expect(result.errorCode).toBeNull();
    expect(result.errorMessage).toBeNull();
    expect(analyzerFake.calls).toHaveLength(1);
    expect(analyzerFake.calls[0]?.instruction).toBe("Resuma o documento");
  });

  it("returns NOT_FOUND when the document does not exist", async () => {
    const { service } = makeService();

    await expect(
      service.retryDocument("missing-document", "user-1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("returns NOT_FOUND when the document belongs to another user", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-2",
    });

    await expect(
      service.retryDocument(document.id, "user-1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });

    expect(repositoryFake.records.get(document.id)?.status).toBe("FAILED");
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("rejects retry when the document is not FAILED", async () => {
    const { service, repositoryFake } = makeService();

    const document = await repositoryFake.repository.create({
      id: "document-1",
      userId: "user-1",
      title: "Contrato",
      instruction: "Resuma o documento",
      s3Key: "user-1/document-1.txt",
      originalName: "contrato.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
    });

    await expect(
      service.retryDocument(document.id, "user-1"),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
    });

    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("keeps the document FAILED when storage retrieval fails", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.failures.get = true;

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("STORAGE_ERROR");
    expect(result.errorMessage).toContain("recuperar o arquivo");
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("keeps the document FAILED when analysis fails", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("Conteúdo do contrato para análise."),
      contentType: document.mimeType,
    });

    analyzerFake.failWith(new Error("Unexpected analyzer failure"));

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("INTERNAL_ERROR");
    expect(result.errorMessage).toBe(
      "Erro inesperado ao processar o documento.",
    );
  });

  it("does not analyze a document with an unsupported persisted MIME type", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
      mimeType: "application/octet-stream",
    });

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("UNSUPPORTED_FILE_TYPE");
    expect(analyzerFake.calls).toHaveLength(0);
  });
});
