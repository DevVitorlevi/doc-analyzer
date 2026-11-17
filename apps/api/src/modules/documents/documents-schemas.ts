import { z } from "zod";
import type { Document as DocumentRecord } from "@prisma/client";

export const createDocumentFieldsSchema = z.object({
  title: z
    .string({ error: "O título é obrigatório." })
    .trim()
    .min(1, "O título é obrigatório.")
    .max(120, "O título deve ter no máximo 120 caracteres."),
  instruction: z
    .string({ error: "A instrução é obrigatória." })
    .trim()
    .min(1, "A instrução é obrigatória.")
    .max(2000, "A instrução deve ter no máximo 2000 caracteres."),
});

export interface DocumentResponse {
  id: string;
  title: string;
  instruction: string;
  status: string;
  analysis: string | null;
  truncated: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export function toDocumentResponse(document: DocumentRecord): DocumentResponse {
  return {
    id: document.id,
    title: document.title,
    instruction: document.instruction,
    status: document.status,
    analysis: document.analysis,
    truncated: document.truncated,
    errorCode: document.errorCode,
    errorMessage: document.errorMessage,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt.toISOString(),
  };
}
