import { apiRequest } from "@/lib/http";

import type {
  DocumentDetail,
  DocumentListItem,
  DocumentResponse,
  UploadDocumentInput,
} from "./types";

function documentPath(id: string): string {
  return `/documents/${encodeURIComponent(id)}`;
}

export function listDocuments(): Promise<DocumentListItem[]> {
  return apiRequest<DocumentListItem[]>("/documents");
}

export function getDocument(id: string): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(documentPath(id));
}

export function uploadDocument({
  title,
  instruction,
  file,
}: UploadDocumentInput): Promise<DocumentResponse> {
  const body = new FormData();

  body.append("title", title);
  body.append("instruction", instruction);
  body.append("file", file);

  return apiRequest<DocumentResponse>("/documents", {
    method: "POST",
    body,
  });
}

export function retryDocument(id: string): Promise<DocumentResponse> {
  return apiRequest<DocumentResponse>(`${documentPath(id)}/retry`, {
    method: "POST",
  });
}

export function deleteDocument(id: string): Promise<void> {
  return apiRequest<void>(documentPath(id), { method: "DELETE" });
}
