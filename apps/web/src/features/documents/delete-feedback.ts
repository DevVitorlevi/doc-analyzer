import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { ApiError } from "@/lib/http";

import type { DeleteReport } from "./use-delete-documents";

const SINGLE_COUNT = 1;

export function formatDeleteSuccess(count: number): string {
  return count === SINGLE_COUNT
    ? "Documento excluído."
    : `${count} documentos excluídos.`;
}

export function formatDeletePartial(
  deleted: number,
  total: number,
  failed: number,
): string {
  return `${deleted} de ${total} documentos excluídos. Não foi possível excluir ${failed}.`;
}

function getFailureMessage(error: unknown): string {
  return error instanceof ApiError
    ? getErrorMessage(error.code)
    : getErrorMessage("INTERNAL_ERROR");
}

export function notifyDeleteReport(report: DeleteReport): void {
  if (report.sessionExpired) {
    return;
  }

  if (report.failedIds.length === 0) {
    toast.success(formatDeleteSuccess(report.deletedIds.length));
    return;
  }

  if (report.total === SINGLE_COUNT) {
    toast.error(getFailureMessage(report.firstError));
    return;
  }

  toast.error(
    formatDeletePartial(
      report.deletedIds.length,
      report.total,
      report.failedIds.length,
    ),
  );
}
