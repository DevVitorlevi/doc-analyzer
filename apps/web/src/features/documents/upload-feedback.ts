import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { ApiError } from "@/lib/http";

import type { DocumentResponse, DocumentStatus } from "./types";

const SUCCESS_MESSAGE = "Documento analisado com sucesso.";
const BACKGROUND_FAILURE_MESSAGE =
  "A análise não pôde ser concluída. Abra o documento para ver o motivo.";
const UNAUTHORIZED_STATUS = 401;

export function notifyUploadResult(document: DocumentResponse): void {
  switch (document.status) {
    case "COMPLETED":
      toast.success(SUCCESS_MESSAGE);
      return;
    case "FAILED":
      toast.error(getErrorMessage(document.errorCode ?? "INTERNAL_ERROR"));
      return;
    case "PROCESSING":
      return;
    default: {
      const unreachable: never = document.status;
      return unreachable;
    }
  }
}

export function notifyProcessingFinished(
  status: Exclude<DocumentStatus, "PROCESSING">,
): void {
  if (status === "COMPLETED") {
    toast.success(SUCCESS_MESSAGE);
    return;
  }

  toast.error(BACKGROUND_FAILURE_MESSAGE);
}

export function notifyUploadError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.status === UNAUTHORIZED_STATUS) {
      return;
    }

    toast.error(getErrorMessage(error.code));
    return;
  }

  toast.error(getErrorMessage("INTERNAL_ERROR"));
}
