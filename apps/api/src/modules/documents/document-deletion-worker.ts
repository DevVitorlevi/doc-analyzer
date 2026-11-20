import type { FastifyBaseLogger } from "fastify";

import type { StorageProvider } from "@/integrations/storage/s3-storage";
import type { DocumentRepository } from "@/repositories/document-repository";

interface DocumentDeletionWorkerDeps {
  documents: DocumentRepository;
  storage: StorageProvider;
  logger: Pick<FastifyBaseLogger, "warn" | "error">;
  pollIntervalMs?: number;
  leaseDurationMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_LEASE_DURATION_MS = 60_000;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;
const MAX_ERROR_LENGTH = 2_000;

export function createDocumentDeletionWorker(
  deps: DocumentDeletionWorkerDeps,
) {
  const pollIntervalMs =
    deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const leaseDurationMs =
    deps.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;

  let interval: ReturnType<typeof setInterval> | null = null;
  let running: Promise<void> | null = null;

  function getRetryDelay(attempts: number): number {
    const exponent = Math.min(Math.max(attempts - 1, 0), 20);

    return Math.min(
      BASE_RETRY_DELAY_MS * 2 ** exponent,
      MAX_RETRY_DELAY_MS,
    );
  }

  async function processPendingDeletions(): Promise<void> {
    while (true) {
      const now = new Date();
      const leaseUntil = new Date(now.getTime() + leaseDurationMs);

      const task = await deps.documents.claimNextDeletion(
        now,
        leaseUntil,
      );

      if (!task) {
        return;
      }

      try {
        await deps.storage.deleteObject(task.s3Key);

        const completed = await deps.documents.completeDeletion(
          task.id,
          task.leaseUntil,
        );

        if (!completed) {
          deps.logger.warn(
            { documentId: task.id },
            "Document deletion lease expired before completion",
          );
        }
      } catch (error) {
        const nextAttemptAt = new Date(
          Date.now() + getRetryDelay(task.attempts),
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown deletion error";

        try {
          const rescheduled = await deps.documents.rescheduleDeletion(
            task.id,
            task.leaseUntil,
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
              "Document deletion failed and was scheduled for retry",
            );
          } else {
            deps.logger.warn(
              { documentId: task.id },
              "Document deletion could not be rescheduled because its lease is no longer valid",
            );
          }
        } catch (rescheduleError) {
          deps.logger.error(
            {
              err: rescheduleError,
              documentId: task.id,
              originalError: error,
            },
            "Failed to reschedule document deletion",
          );
        }
      }
    }
  }

  function trigger(): void {
    if (running) {
      return;
    }

    running = processPendingDeletions()
      .catch((error: unknown) => {
        deps.logger.error(
          { err: error },
          "Document deletion worker failed",
        );
      })
      .finally(() => {
        running = null;
      });
  }

  function start(): void {
    if (interval) {
      return;
    }

    trigger();

    interval = setInterval(trigger, pollIntervalMs);
    interval.unref();
  }

  async function stop(): Promise<void> {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    if (running) {
      await running;
    }
  }

  return {
    start,
    stop,
    processPendingDeletions,
  };
}
