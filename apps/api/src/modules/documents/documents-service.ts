import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { Document as DocumentRecord } from "@prisma/client";
import type { DocumentAnalyzer } from "@/integrations/openai/openai-analyzer";
import type { StorageProvider } from "@/integrations/storage/s3-storage";
import {
  extractText,
  type DocumentFormat,
} from "@/integrations/text-extraction/text-extractor";
import type { DocumentRepository } from "@/repositories/document-repository";
import { AppError } from "@/shared/errors/app-error";
import { detectFileType, sanitizeFileName } from "./file-validation";
import {
  isExpectedProcessingError,
  toProcessingFailure,
  type ProcessingFailure,
} from "./processing-failure";

export interface DocumentServiceDeps {
  documents: DocumentRepository;
  storage: StorageProvider;
  analyzer: DocumentAnalyzer;
  logger: Pick<FastifyBaseLogger, "warn" | "error">;
  maxTextChars: number;
  maxFileSizeBytes: number;
}

export interface CreateDocumentInput {
  userId: string;
  title: string;
  instruction: string;
  file: {
    originalName: string;
    buffer: Buffer;
  };
}

type AnalysisOutcome =
  | { ok: true; analysis: string; truncated: boolean }
  | { ok: false; failure: ProcessingFailure; truncated: boolean };

export function createDocumentService(deps: DocumentServiceDeps) {
  async function removeOrphanObject(key: string): Promise<void> {
    try {
      await deps.storage.deleteObject(key);
    } catch {
      deps.logger.error(
        { s3Key: key },
        "Failed to remove orphan storage object",
      );
    }
  }

  async function runAnalysis(
    instruction: string,
    buffer: Buffer,
    format: DocumentFormat,
  ): Promise<AnalysisOutcome> {
    let truncated = false;

    try {
      const extracted = await extractText(buffer, format, deps.maxTextChars);
      truncated = extracted.truncated;

      const analysis = await deps.analyzer.analyze({
        instruction,
        text: extracted.text,
        truncated,
      });

      return { ok: true, analysis, truncated };
    } catch (error) {
      if (!isExpectedProcessingError(error)) {
        deps.logger.error(
          { err: error },
          "Unexpected error while processing document",
        );
      }

      return { ok: false, failure: toProcessingFailure(error), truncated };
    }
  }

  async function createDocument(
    input: CreateDocumentInput,
  ): Promise<DocumentRecord> {
    const { buffer } = input.file;

    if (buffer.length === 0) {
      throw new AppError("VALIDATION_ERROR", "O arquivo está vazio.", 400);
    }

    if (buffer.length > deps.maxFileSizeBytes) {
      throw new AppError(
        "FILE_TOO_LARGE",
        "O arquivo excede o tamanho máximo permitido.",
        413,
      );
    }

    const detected = await detectFileType(buffer, input.file.originalName);

    const documentId = randomUUID();
    const s3Key = `${input.userId}/${documentId}.${detected.extension}`;

    try {
      await deps.storage.putObject({
        key: s3Key,
        body: buffer,
        contentType: detected.mimeType,
      });
    } catch (error) {
      throw new AppError(
        "STORAGE_ERROR",
        "Não foi possível salvar o arquivo. Tente novamente.",
        502,
        error,
      );
    }

    let document: DocumentRecord;

    try {
      document = await deps.documents.create({
        id: documentId,
        userId: input.userId,
        title: input.title,
        instruction: input.instruction,
        s3Key,
        originalName: sanitizeFileName(input.file.originalName),
        mimeType: detected.mimeType,
        sizeBytes: buffer.length,
      });
    } catch (error) {
      await removeOrphanObject(s3Key);
      throw error;
    }

    const outcome = await runAnalysis(
      document.instruction,
      buffer,
      detected.format,
    );

    if (outcome.ok) {
      return deps.documents.markCompleted(document.id, document.userId, {
        analysis: outcome.analysis,
        truncated: outcome.truncated,
      });
    }

    deps.logger.warn(
      { documentId: document.id, errorCode: outcome.failure.errorCode },
      "Document analysis failed",
    );

    return deps.documents.markFailed(document.id, document.userId, {
      errorCode: outcome.failure.errorCode,
      errorMessage: outcome.failure.errorMessage,
      truncated: outcome.truncated,
    });
  }

  return { createDocument };
}

export type DocumentService = ReturnType<typeof createDocumentService>;
