import { randomUUID } from "node:crypto";

import type { FastifyBaseLogger } from "fastify";

import type { Document as DocumentRecord } from "@prisma/client";

import type { DocumentAnalyzer } from "@/integrations/openai/openai-analyzer";

import type { StorageProvider } from "@/integrations/storage/s3-storage";

import type { DocumentFormat } from "@/integrations/text-extraction/text-extractor";

import type { DocumentRepository } from "@/repositories/document-repository";

import { AppError } from "@/shared/errors/app-error";

import { detectFileType, sanitizeFileName } from "./file-validation";


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

export interface DocumentDetail {
  document: DocumentRecord;
  fileUrl: string;
}

const DOCUMENT_FORMATS: Record<string, DocumentFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
};

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

    return document;
  }

  async function retryDocument(
    id: string,
    userId: string,
  ): Promise<DocumentRecord> {
    const document = await deps.documents.findByIdForUser(id, userId);

    if (!document) {
      throw new AppError("NOT_FOUND", "Documento não encontrado.", 404);
    }

    if (document.status !== "FAILED") {
      throw new AppError(
        "CONFLICT",
        "Somente documentos com falha podem ser reprocessados.",
        409,
      );
    }

    const format = DOCUMENT_FORMATS[document.mimeType];

    if (!format) {
      return deps.documents.markFailed(id, userId, {
        errorCode: "UNSUPPORTED_FILE_TYPE",
        errorMessage:
          "O formato do arquivo não é suportado para reprocessamento.",
        truncated: false,
      });
    }

    const claimed = await deps.documents.markProcessing(id, userId);

    if (!claimed) {
      throw new AppError(
        "CONFLICT",
        "O documento não está mais disponível para reprocessamento.",
        409,
      );
    }

    const updated = await deps.documents.findByIdForUser(id, userId);

    if (!updated) {
      throw new AppError(
        "NOT_FOUND",
        "Documento não encontrado.",
        404,
      );
    }

    return updated;
  }

  async function listDocuments(userId: string): Promise<DocumentRecord[]> {
    return deps.documents.listByUser(userId);
  }

  async function getDocumentById(
    id: string,
    userId: string,
  ): Promise<DocumentDetail> {
    const document = await deps.documents.findByIdForUser(id, userId);

    if (!document) {
      throw new AppError("NOT_FOUND", "Documento não encontrado.", 404);
    }

    let fileUrl: string;

    try {
      fileUrl = await deps.storage.getPresignedReadUrl(document.s3Key);
    } catch (error) {
      throw new AppError(
        "STORAGE_ERROR",
        "Não foi possível gerar o link para acessar o documento.",
        502,
        error,
      );
    }

    return { document, fileUrl };
  }

  async function deleteDocument(id: string, userId: string): Promise<void> {
    const document = await deps.documents.findByIdForUser(id, userId);

    if (!document) {
      throw new AppError("NOT_FOUND", "Documento não encontrado.", 404);
    }

    const queued = await deps.documents.requestDeletion(id, userId);

    if (!queued) {
      throw new AppError("NOT_FOUND", "Documento não encontrado.", 404);
    }
  }

  return {
    createDocument,
    retryDocument,
    listDocuments,
    getDocumentById,
    deleteDocument,
  };
}

export type DocumentService = ReturnType<typeof createDocumentService>;
