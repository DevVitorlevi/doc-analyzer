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

  it("queues document deletion without immediately deleting the storage object", async () => {
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

    expect(repositoryFake.records.has(document.id)).toBe(true);

    expect(repositoryFake.records.get(document.id)?.status).toBe(
      "DELETION_PENDING",
    );

    expect(storageFake.objects.has(document.s3Key)).toBe(true);

    expect(
      await repositoryFake.repository.findByIdForUser(document.id, "user-1"),
    ).toBeNull();
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
    expect(repositoryFake.records.get(document.id)?.status).not.toBe(
      "DELETION_PENDING",
    );
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("does not expose a document after it has been queued for deletion", async () => {
    const { service, repositoryFake } = makeService();

    const document = await createDocument(repositoryFake.repository, {
      id: "document-1",
      userId: "user-1",
    });

    await service.deleteDocument(document.id, "user-1");

    await expect(
      service.deleteDocument(document.id, "user-1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });

    expect(repositoryFake.records.has(document.id)).toBe(true);
  });
});
