import { beforeEach, describe, expect, it } from "vitest";
import { AiAnalysisError } from "@/integrations/openai/ai-analysis-error";
import {
  createDocumentService,
  type CreateDocumentInput,
} from "@/modules/documents/documents-service";
import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";
import { createFakeDocumentRepository } from "../helpers/fake-document-repository";
import { createFakeStorage } from "../helpers/fake-storage";
import { makePdf } from "../helpers/document-fixtures";

const noopLogger = {
  warn: () => undefined,
  error: () => undefined,
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function makeInput(
  overrides: Partial<CreateDocumentInput> = {},
): CreateDocumentInput {
  return {
    userId: "user-1",
    title: "Contrato",
    instruction: "Resuma o documento",
    file: {
      originalName: "contrato.txt",
      buffer: Buffer.from("Cláusula primeira: o contrato vale um ano."),
    },
    ...overrides,
  };
}

describe("document service", () => {
  const storageFake = createFakeStorage();
  const analyzerFake = createFakeDocumentAnalyzer();

  beforeEach(() => {
    storageFake.reset();
    analyzerFake.reset();
  });

  function makeService(
    options: { failCreate?: boolean; maxTextChars?: number } = {},
  ) {
    const repositoryFake = createFakeDocumentRepository({
      failCreate: options.failCreate ?? false,
    });

    const service = createDocumentService({
      documents: repositoryFake.repository,
      storage: storageFake.storage,
      analyzer: analyzerFake.analyzer,
      logger: noopLogger,
      maxTextChars: options.maxTextChars ?? 60000,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    });

    return { service, repositoryFake };
  }

  it("stores the file, analyzes it and completes the document", async () => {
    const { service, repositoryFake } = makeService();

    const document = await service.createDocument(makeInput());

    expect(document.status).toBe("COMPLETED");
    expect(document.analysis).toBe(analyzerFake.defaultResponse);
    expect(document.s3Key).toBe(`user-1/${document.id}.txt`);
    expect(document.mimeType).toBe("text/plain");
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
    expect(repositoryFake.records.size).toBe(1);

    expect(analyzerFake.calls).toHaveLength(1);
    expect(analyzerFake.calls[0]).toMatchObject({
      instruction: "Resuma o documento",
      truncated: false,
    });
  });

  it("flags truncated text and informs the analyzer", async () => {
    const { service } = makeService({ maxTextChars: 10 });

    const document = await service.createDocument(
      makeInput({
        file: {
          originalName: "longo.txt",
          buffer: Buffer.from("a".repeat(100)),
        },
      }),
    );

    expect(document.status).toBe("COMPLETED");
    expect(document.truncated).toBe(true);
    expect(analyzerFake.calls[0]?.truncated).toBe(true);
    expect(analyzerFake.calls[0]?.text).toHaveLength(10);
  });

  it("rejects an empty file before touching storage", async () => {
    const { service, repositoryFake } = makeService();

    await expect(
      service.createDocument(
        makeInput({
          file: { originalName: "vazio.txt", buffer: Buffer.alloc(0) },
        }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 400 });

    expect(storageFake.objects.size).toBe(0);
    expect(repositoryFake.records.size).toBe(0);
  });

  it("rejects an unsupported file type before touching storage", async () => {
    const { service, repositoryFake } = makeService();

    await expect(
      service.createDocument(
        makeInput({
          file: { originalName: "planilha.csv", buffer: Buffer.from("a,b") },
        }),
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });

    expect(storageFake.objects.size).toBe(0);
    expect(repositoryFake.records.size).toBe(0);
  });

  it("does not create a record when the storage upload fails", async () => {
    const { service, repositoryFake } = makeService();
    storageFake.failures.put = true;

    await expect(service.createDocument(makeInput())).rejects.toMatchObject({
      code: "STORAGE_ERROR",
      statusCode: 502,
    });

    expect(repositoryFake.records.size).toBe(0);
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("removes the orphan object when the database insert fails", async () => {
    const { service } = makeService({ failCreate: true });

    await expect(service.createDocument(makeInput())).rejects.toThrow(
      "db down",
    );

    expect(storageFake.objects.size).toBe(0);
  });

  it("still rethrows the database error when the orphan cleanup also fails", async () => {
    const { service } = makeService({ failCreate: true });
    storageFake.failures.delete = true;

    await expect(service.createDocument(makeInput())).rejects.toThrow(
      "db down",
    );
  });

  it("marks the document as FAILED when the AI fails, keeping the file", async () => {
    const { service } = makeService();
    analyzerFake.failWith(new AiAnalysisError("AI_RATE_LIMIT"));

    const document = await service.createDocument(makeInput());

    expect(document.status).toBe("FAILED");
    expect(document.errorCode).toBe("AI_RATE_LIMIT");
    expect(document.errorMessage).toBeTruthy();
    expect(document.analysis).toBeNull();
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("marks the document as FAILED/UNREADABLE_FILE when there is no text", async () => {
    const { service } = makeService();

    const document = await service.createDocument(
      makeInput({
        file: { originalName: "escaneado.pdf", buffer: makePdf([[]]) },
      }),
    );

    expect(document.status).toBe("FAILED");
    expect(document.errorCode).toBe("UNREADABLE_FILE");
    expect(analyzerFake.calls).toHaveLength(0);
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("marks unexpected processing errors as FAILED/INTERNAL_ERROR", async () => {
    const { service } = makeService();
    analyzerFake.failWith(new Error("unexpected"));

    const document = await service.createDocument(makeInput());

    expect(document.status).toBe("FAILED");
    expect(document.errorCode).toBe("INTERNAL_ERROR");
    expect(document.errorMessage).not.toContain("unexpected");
  });
});
