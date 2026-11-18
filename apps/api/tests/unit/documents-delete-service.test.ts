import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentService } from "@/modules/documents/documents-service";

import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";
import { createFakeDocumentRepository } from "../helpers/fake-document-repository";
import { createFakeStorage } from "../helpers/fake-storage";

const storageFake = createFakeStorage();
const analyzerFake = createFakeDocumentAnalyzer();

function makeService(options: { failDelete?: boolean } = {}) {
  const repositoryFake = createFakeDocumentRepository(options);

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

  return {
    service,
    repositoryFake,
    logger,
  };
}

async function createDocument(
  repository: ReturnType<typeof createFakeDocumentRepository>["repository"],
  input: {
    id: string;
    userId: string;
  },
) {
  return repository.create({
    id: input.id,
    userId: input.userId,
    title: "Contrato",
    instruction: "Resuma o documento",
    s3Key: `${input.userId}/${input.id}.txt`,
    originalName: "contrato.txt",
    mimeType: "text/plain",
    sizeBytes: 100,
  });
}

describe("Document delete service", () => {
  beforeEach(() => {
    storageFake.reset();
  });

  it("deletes the storage object and database record", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    await expect(
      service.deleteDocument(document.id, "user-1"),
    ).resolves.toBeUndefined();

    expect(repositoryFake.records.has(document.id)).toBe(false);
    expect(storageFake.objects.has(document.s3Key)).toBe(false);
  });

  it("throws NOT_FOUND when the document does not exist", async () => {
    const { service } = makeService();

    await expect(
      service.deleteDocument("missing-document", "user-1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
      message: "Documento não encontrado.",
    });
  });

  it("throws NOT_FOUND when the document belongs to another user", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-2",
    });

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    await expect(
      service.deleteDocument(document.id, "user-1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });

    expect(repositoryFake.records.has(document.id)).toBe(true);
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("throws STORAGE_ERROR and preserves the database record when storage deletion fails", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    storageFake.failures.delete = true;

    await expect(
      service.deleteDocument(document.id, "user-1"),
    ).rejects.toMatchObject({
      code: "STORAGE_ERROR",
      statusCode: 502,
      message: "Não foi possível excluir o arquivo do documento.",
    });

    expect(repositoryFake.records.has(document.id)).toBe(true);
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("throws INTERNAL_ERROR and logs the failure when database deletion fails", async () => {
    const { service, repositoryFake, logger } = makeService({
      failDelete: true,
    });

    const document = await createDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    await expect(
      service.deleteDocument(document.id, "user-1"),
    ).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      statusCode: 500,
      message: "Não foi possível concluir a exclusão do documento.",
    });

    expect(repositoryFake.records.has(document.id)).toBe(true);
    expect(storageFake.objects.has(document.s3Key)).toBe(false);
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
