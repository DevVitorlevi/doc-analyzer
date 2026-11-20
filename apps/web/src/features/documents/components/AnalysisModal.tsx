import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatSize, mimeToExt, mimeToLabel } from "@/lib/format";
import { ApiError } from "@/lib/http";

import { DOCUMENTS_QUERY_KEY, useDocument, useRetryDocument } from "../queries";
import { notifyUploadError, notifyUploadResult } from "../upload-feedback";

import AnalysisFailureBlock from "./AnalysisFailureBlock";

const MODAL_TITLE = "Análise da IA";
const TITLE_LABEL = "Título";
const ANALYSIS_LABEL = "Análise da IA";
const LOADING_LABEL = "Carregando análise...";
const PROCESSING_LABEL = "Processando";
const METADATA_SEPARATOR = " · ";
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const LABEL_CLASS = "text-md px-3 font-medium text-text-primary";

interface DocumentInfoBlockProps {
  mimeType: string;
  sizeBytes: number;
}

function DocumentInfoBlock({ mimeType, sizeBytes }: DocumentInfoBlockProps) {
  const metadata = [formatSize(sizeBytes), mimeToExt(mimeType)]
    .filter((part) => part !== "")
    .join(METADATA_SEPARATOR);

  return (
    <div
      className={[
        "relative flex h-(--upload-dialog-preview-height) items-center",
        "justify-center rounded-(--radius-preview-content) bg-preview",
        "p-(--space-16)",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-(--thumbnail-height) w-(--thumbnail-width) shrink-0",
          "items-center justify-center rounded-(--radius-thumbnail)",
          "border border-border bg-surface-white",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="text-[length:var(--font-size-secondary-description)] font-semibold leading-[var(--line-height-secondary-description)] text-text-secondary"
        >
          {mimeToLabel(mimeType)}
        </span>
      </div>

      <p className="absolute bottom-(--space-8) left-(--space-16) text-[length:var(--font-size-secondary-description)] leading-[var(--line-height-secondary-description)] text-text-secondary">
        {metadata}
      </p>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-(--space-16)">
      <span className="sr-only">{LOADING_LABEL}</span>

      <div
        aria-hidden="true"
        className="h-(--upload-dialog-preview-height) rounded-(--radius-preview-content) bg-preview motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="h-10 rounded-(--radius-input) bg-control-secondary motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="h-(--analysis-field-height) rounded-(--radius-input) bg-control-secondary motion-safe:animate-pulse"
      />
    </div>
  );
}

interface AnalysisModalProps {
  documentId: string | null;
  onClose: () => void;
}

export default function AnalysisModal({
  documentId,
  onClose,
}: AnalysisModalProps) {
  const titleId = useId();
  const analysisLabelId = useId();
  const queryClient = useQueryClient();
  const retryingRef = useRef(false);

  const [displayedId, setDisplayedId] = useState<string | null>(documentId);

  if (documentId !== null && documentId !== displayedId) {
    setDisplayedId(documentId);
  }

  const query = useDocument(displayedId);
  const retry = useRetryDocument();
  const isRetrying = retry.isPending;

  const notFound =
    query.error instanceof ApiError && query.error.status === NOT_FOUND_STATUS;

  useEffect(() => {
    if (notFound) {
      void queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    }
  }, [notFound, queryClient]);

  const errorMessage =
    query.error instanceof ApiError
      ? getErrorMessage(query.error.code)
      : getErrorMessage("INTERNAL_ERROR");

  function handleRetryError(error: unknown) {
    notifyUploadError(error);

    if (!(error instanceof ApiError)) {
      return;
    }

    if (error.status === NOT_FOUND_STATUS) {
      void queryClient.invalidateQueries({
        queryKey: DOCUMENTS_QUERY_KEY,
        exact: true,
      });
      onClose();
      return;
    }

    if (error.status === CONFLICT_STATUS) {
      void queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    }
  }

  function handleRetry() {
    if (displayedId === null || retryingRef.current) {
      return;
    }

    retryingRef.current = true;

    retry.mutate(displayedId, {
      onSuccess: notifyUploadResult,
      onError: handleRetryError,
      onSettled: () => {
        retryingRef.current = false;
      },
    });
  }

  return (
    <Dialog
      open={documentId !== null}
      onOpenChange={(open) => {
        if (!open && !isRetrying) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        closeDisabled={isRetrying}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[length:var(--font-size-dialog-title)] font-medium leading-[var(--line-height-dialog-title)] text-text-primary">
            {MODAL_TITLE}
          </DialogTitle>
        </DialogHeader>

        {query.isError && (
          <p
            role="alert"
            className="px-3 py-8 text-center text-[length:var(--font-size-empty-description)] leading-[var(--line-height-empty-description)] text-text-primary"
          >
            {errorMessage}
          </p>
        )}

        {query.isPending && <AnalysisSkeleton />}

        {query.isSuccess && (
          <div className="flex flex-col gap-(--space-16)">
            <DocumentInfoBlock
              mimeType={query.data.mimeType}
              sizeBytes={query.data.sizeBytes}
            />

            <div className="flex flex-col gap-(--space-8)">
              <div className="flex flex-col gap-1">
                <label htmlFor={titleId} className={LABEL_CLASS}>
                  {TITLE_LABEL}
                </label>
                <Input
                  id={titleId}
                  readOnly
                  value={query.data.title}
                  className="border-none text-md min-h-10"
                />
              </div>

              {renderStatusContent()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function renderStatusContent() {
    if (!query.isSuccess) {
      return null;
    }

    const { status, analysis, errorCode } = query.data;

    switch (status) {
      case "COMPLETED":
        return (
          <div className="flex flex-col gap-1">
            <p id={analysisLabelId} className={LABEL_CLASS}>
              {ANALYSIS_LABEL}
            </p>
            <div
              role="region"
              aria-labelledby={analysisLabelId}
              tabIndex={0}
              className={[
                "h-(--analysis-field-height) w-full overflow-y-auto",
                "rounded-(--radius-input) bg-control-secondary px-4 py-2",
                "whitespace-pre-wrap wrap-break-word text-md text-text-primary",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                "focus-visible:outline-(--color-primary-action)",
              ].join(" ")}
            >
              {analysis ?? ""}
            </div>
          </div>
        );
      case "FAILED":
        return (
          <AnalysisFailureBlock
            errorCode={errorCode}
            isRetrying={isRetrying}
            onRetry={handleRetry}
          />
        );
      case "PROCESSING":
        return (
          <p
            role="status"
            className="rounded-(--radius-input) bg-control-secondary px-4 py-3 text-md text-text-secondary"
          >
            {PROCESSING_LABEL}
          </p>
        );
      default: {
        const unreachable: never = status;
        return unreachable;
      }
    }
  }
}
