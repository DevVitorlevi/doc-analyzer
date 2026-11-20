import type { FastifyBaseLogger } from "fastify";
import type { DocumentAnalyzer } from "@/integrations/openai/openai-analyzer";
import type { StorageProvider } from "@/integrations/storage/s3-storage";
import type { DocumentRepository } from "@/repositories/document-repository";
import { processDocumentAnalysis } from "./document-analysis-processor";

interface DocumentAnalysisWorkerDeps {
  documents: DocumentRepository;
  storage: StorageProvider;
  analyzer: DocumentAnalyzer;
  logger: Pick<FastifyBaseLogger, "warn" | "error">;
  maxTextChars: number;
  pollIntervalMs?: number;
  leaseDurationMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_LEASE_DURATION_MS = 5 * 60_000;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60 * 60_000;
const MAX_ERROR_LENGTH = 2_000;
const MAX_ANALYSIS_ATTEMPTS = 5;

const DOCUMENT_FORMATS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
} as const;

export function createDocumentAnalysisWorker(deps: DocumentAnalysisWorkerDeps) {
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const leaseDurationMs = deps.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;

  let interval: ReturnType<typeof setInterval> | null = null;
  let running: Promise<void> | null = null;

  function getRetryDelay(attempts: number): number {
    const exponent = Math.min(Math.max(attempts - 1, 0), 20);
    return Math.min(BASE_RETRY_DELAY_MS * 2 ** exponent, MAX_RETRY_DELAY_MS);
  }

  async function processPendingAnalyses(): Promise<void> {
    while (true) {
      const now = new Date();
      const leaseUntil = new Date(now.getTime() + leaseDurationMs);

      const task = await deps.documents.claimNextAnalysis(now, leaseUntil);

      if (!task) return;

      try {
        const format =
          DOCUMENT_FORMATS[task.mimeType as keyof typeof DOCUMENT_FORMATS];

        if (!format) {
          await deps.documents.failAnalysis(task, {
            errorCode: "UNSUPPORTED_FILE_TYPE",
            errorMessage: "O formato do arquivo não é suportado para análise.",
            truncated: false,
          });
          continue;
        }

        const buffer = await deps.storage.getObject(task.s3Key);

        const outcome = await processDocumentAnalysis(
          {
            analyzer: deps.analyzer,
            maxTextChars: deps.maxTextChars,
            logger: deps.logger,
          },
          {
            instruction: task.instruction,
            buffer,
            format,
          },
        );

        if (outcome.ok) {
          const completed = await deps.documents.completeAnalysis(task, {
            analysis: outcome.analysis,
            truncated: outcome.truncated,
          });

          if (!completed) {
            deps.logger.warn(
              { documentId: task.id },
              "Document analysis lease expired before completion",
            );
          }
        } else {
          const failed = await deps.documents.failAnalysis(task, {
            errorCode: outcome.failure.errorCode,
            errorMessage: outcome.failure.errorMessage,
            truncated: outcome.truncated,
          });

          if (failed) {
            deps.logger.warn(
              {
                documentId: task.id,
                errorCode: outcome.failure.errorCode,
              },
              "Document analysis failed",
            );
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown analysis error";

        try {
          if (task.attempts >= MAX_ANALYSIS_ATTEMPTS) {
            const failed = await deps.documents.failAnalysis(task, {
              errorCode: "STORAGE_ERROR",
              errorMessage: "Não foi possível ler o arquivo para análise.",
              truncated: false,
            });

            if (failed) {
              deps.logger.error(
                {
                  err: error,
                  documentId: task.id,
                  attempts: task.attempts,
                },
                "Document analysis gave up after repeated interruptions",
              );
            }

            continue;
          }

          const nextAttemptAt = new Date(
            Date.now() + getRetryDelay(task.attempts),
          );

          const rescheduled = await deps.documents.rescheduleAnalysis(
            task,
            nextAttemptAt,
            errorMessage.slice(0, MAX_ERROR_LENGTH),
          );

          if (rescheduled) {
            deps.logger.warn(
              {
                err: error,
                documentId: task.id,
                attempts: task.attempts,
                nextAttemptAt,
              },
              "Document analysis interrupted and scheduled for retry",
            );
          }
        } catch (rescheduleError) {
          deps.logger.error(
            {
              err: rescheduleError,
              documentId: task.id,
              originalError: error,
            },
            "Failed to reschedule document analysis",
          );
        }
      }
    }
  }

  function trigger(): void {
    if (running) return;

    running = processPendingAnalyses()
      .catch((error: unknown) => {
        deps.logger.error({ err: error }, "Document analysis worker failed");
      })
      .finally(() => {
        running = null;
      });
  }

  function start(): void {
    if (interval) return;

    trigger();
    interval = setInterval(trigger, pollIntervalMs);
    interval.unref();
  }

  async function stop(): Promise<void> {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    if (running) await running;
  }

  return {
    start,
    stop,
    processPendingAnalyses,
  };
}
