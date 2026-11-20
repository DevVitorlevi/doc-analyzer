import type { ProcessingErrorCode } from "@/lib/errors";

export type DocumentStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export interface DocumentListItem {
  id: string;
  title: string;
  createdAt: string;
  sizeBytes: number;
  mimeType: string;
  status: DocumentStatus;
}

export interface DocumentResponse {
  id: string;
  title: string;
  instruction: string;
  status: DocumentStatus;
  analysis: string | null;
  truncated: boolean;
  errorCode: ProcessingErrorCode | null;
  errorMessage: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface DocumentDetail extends DocumentResponse {
  fileUrl: string;
}

export interface UploadDocumentInput {
  title: string;
  instruction: string;
  file: File;
}
