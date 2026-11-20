import { describe, expect, it, vi } from "vitest";

import type { DocumentAnalyzer } from "@/integrations/openai/openai-analyzer";
import type { StorageProvider } from "@/integrations/storage/s3-storage";
import { createFakeDocumentRepository } from "../helpers/fake-document-repository";
import { createDocumentAnalysisWorker } from "@/modules/documents/document-analysis-worker";

async function setup(options?: {
  mimeType?: string;
  storageError?: boolean;
  analyzerError?: boolean;
}) {
  const { repository, records } = createFakeDocumentRepository();

  await repository.create({
    id: "document-1",
    userId: "user-1",
    title: "teste.txt",
    originalName: "teste.txt",
    mimeType: options?.mimeType ?? "text/plain",
    sizeBytes: 20,
    s3Key: "documents/document-1",
    instruction: "Resuma o documento.",
  } as Parameters<typeof repository.create>[0]);

  const storage = {
    putObject: vi.fn(),
    getObject: options?.storageError
      ? vi.fn().mockRejectedValue(new Error("B2 indisponível"))
      : vi.fn().mockResolvedValue(Buffer.from("Conteúdo do documento para análise.")),
    getPresignedReadUrl: vi.fn(),
    deleteObject: vi.fn(),
  } as unknown as StorageProvider;

  const analyzer = {
    analyze: options?.analyzerError
      ? vi.fn().mockRejectedValue(new Error("OpenAI indisponível"))
      : vi.fn().mockResolvedValue("Análise concluída."),
  } as unknown as DocumentAnalyzer;

  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
  };

  const worker = createDocumentAnalysisWorker({
    documents: repository,
    storage,
    analyzer,
    logger,
    maxTextChars: 10_000,
  });

  return { worker, records, storage, analyzer, logger };
}

describe("document analysis worker", () => {
  it("processes a pending document and marks it as completed", async () => {
    const { worker, records, analyzer, storage } = await setup();

    await worker.processPendingAnalyses();

    const document = records.get("document-1");

    expect(storage.getObject).toHaveBeenCalledWith("documents/document-1");
    expect(analyzer.analyze).toHaveBeenCalledOnce();
    expect(document?.status).toBe("COMPLETED");
    expect(document?.analysis).toBe("Análise concluída.");
    expect(document?.analysisLeaseUntil).toBeNull();
  });

  it("reschedules the document when storage retrieval fails", async () => {
    const { worker, records, analyzer, logger } = await setup({
      storageError: true,
    });

    const before = Date.now();

    await worker.processPendingAnalyses();

    const document = records.get("document-1");

    expect(document?.status).toBe("PROCESSING");
    expect(document?.analysisLeaseUntil).toBeNull();
    expect(document?.analysisNextAttemptAt.getTime()).toBeGreaterThan(before);
    expect(document?.analysisError).toContain("B2 indisponível");
    expect(analyzer.analyze).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("marks the document as failed when document analysis fails", async () => {
    const { worker, records, analyzer } = await setup({
      analyzerError: true,
    });

    await worker.processPendingAnalyses();

    const document = records.get("document-1");

    expect(analyzer.analyze).toHaveBeenCalledOnce();
    expect(document?.status).toBe("FAILED");
    expect(document?.errorCode).toBeTruthy();
    expect(document?.analysisLeaseUntil).toBeNull();
  });

  it("rejects unsupported document formats", async () => {
    const { worker, records, analyzer, storage } = await setup({
      mimeType: "application/zip",
    });

    await worker.processPendingAnalyses();

    const document = records.get("document-1");

    expect(document?.status).toBe("FAILED");
    expect(document?.errorCode).toBe("UNSUPPORTED_FILE_TYPE");
    expect(storage.getObject).not.toHaveBeenCalled();
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });
});
