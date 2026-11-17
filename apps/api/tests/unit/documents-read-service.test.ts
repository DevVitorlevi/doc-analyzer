import { beforeEach, describe, expect, it } from "vitest";

import { createDocumentService } from "@/modules/documents/documents-service";

import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";
import { createFakeDocumentRepository } from "../helpers/fake-document-repository";
import { createFakeStorage } from "../helpers/fake-storage";

const storageFake = createFakeStorage();
const analyzerFake = createFakeDocumentAnalyzer();

const noopLogger = {
  warn: () => {},
  error: () => {},
};

function makeService() {
  const repositoryFake = createFakeDocumentRepository();

  const service = createDocumentService({
    documents: repositoryFake.repository,
    storage: storageFake.storage,
    analyzer: analyzerFake.analyzer,
    logger: noopLogger,
    maxTextChars: 60_000,
    maxFileSizeBytes: 10 * 1024 * 1024,
  });

  return {
    service,
    repositoryFake,
  };
}

async function createDocument(
  repository: ReturnType<typeof createFakeDocumentRepository>["repository"],
  input: {
    id: string;
    userId: string;
    title?: string;
  },
) {
  return repository.create({
    id: input.id,
    userId: input.userId,
    title: input.title ?? "Contrato",
    instruction: "Resuma o documento",
    s3Key: `${input.userId}/${input.id}.txt`,
    originalName: "contrato.txt",
    mimeType: "text/plain",
    sizeBytes: 100,
  });
}

describe("Document read service", () => {
  beforeEach(() => {
    storageFake.reset();
  });

  describe("listDocuments", () => {
    it("returns only documents belonging to the requested user", async () => {
      const { service, repositoryFake } = makeService();

      await createDocument(repositoryFake.repository, {
        id: "document-1",
        userId: "user-1",
        title: "Documento do usuário 1",
      });

      await createDocument(repositoryFake.repository, {
        id: "document-2",
        userId: "user-2",
        title: "Documento do usuário 2",
      });

      await createDocument(repositoryFake.repository, {
        id: "document-3",
        userId: "user-1",
        title: "Outro documento do usuário 1",
      });

      const documents = await service.listDocuments("user-1");

      expect(documents).toHaveLength(2);
      expect(documents.map((document) => document.id)).toEqual([
        "document-1",
        "document-3",
      ]);
      expect(documents.every((document) => document.userId === "user-1")).toBe(
        true,
      );
    });

    it("returns an empty array when the user has no documents", async () => {
      const { service } = makeService();

      await expect(service.listDocuments("user-1")).resolves.toEqual([]);
    });
  });

  describe("getDocumentById", () => {
    it("returns the document and its temporary file URL", async () => {
      const { service, repositoryFake } = makeService();

      const document = await createDocument(repositoryFake.repository, {
        id: "document-1",
        userId: "user-1",
      });

      const result = await service.getDocumentById(document.id, "user-1");

      expect(result.document).toEqual(document);
      expect(result.fileUrl).toBe(
        `https://fake-storage.test/${document.s3Key}`,
      );
    });

    it("throws NOT_FOUND when the document does not exist", async () => {
      const { service } = makeService();

      await expect(
        service.getDocumentById("missing-document", "user-1"),
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

      await expect(
        service.getDocumentById(document.id, "user-1"),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
        message: "Documento não encontrado.",
      });
    });

    it("throws STORAGE_ERROR when generating the temporary URL fails", async () => {
      const { service, repositoryFake } = makeService();

      const document = await createDocument(repositoryFake.repository, {
        id: "document-1",
        userId: "user-1",
      });

      storageFake.failures.presign = true;

      await expect(
        service.getDocumentById(document.id, "user-1"),
      ).rejects.toMatchObject({
        code: "STORAGE_ERROR",
        statusCode: 502,
        message: "Não foi possível gerar o link para acessar o documento.",
      });
    });
  });
});
