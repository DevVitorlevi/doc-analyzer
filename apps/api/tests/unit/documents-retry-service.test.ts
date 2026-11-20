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

  it("queues the analysis without waiting for processing", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("PROCESSING");
    expect(result.errorCode).toBeNull();
    expect(result.errorMessage).toBeNull();
    expect(analyzerFake.calls).toHaveLength(0);
    expect(repositoryFake.records.get(document.id)?.status).toBe("PROCESSING");
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

  it("does not retrieve the stored file during the retry request", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.failures.get = true;

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("PROCESSING");
    expect(result.errorCode).toBeNull();
    expect(repositoryFake.records.get(document.id)?.status).toBe("PROCESSING");
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("does not execute the analyzer during the retry request", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createFailedDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    analyzerFake.failWith(new Error("Unexpected analyzer failure"));

    const result = await service.retryDocument(document.id, "user-1");

    expect(result.status).toBe("PROCESSING");
    expect(result.errorCode).toBeNull();
    expect(repositoryFake.records.get(document.id)?.status).toBe("PROCESSING");
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("does not queue a document with an unsupported persisted MIME type", async () => {
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
    expect(repositoryFake.records.get(document.id)?.status).toBe("FAILED");
  });
});
