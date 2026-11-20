ALTER TYPE "DocumentStatus" ADD VALUE 'DELETION_PENDING';

ALTER TABLE "documents"
  ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
  ADD COLUMN "deletionNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "deletionLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "deletionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deletionError" TEXT;

CREATE INDEX "documents_deletion_queue_idx"
  ON "documents"("status", "deletionNextAttemptAt", "deletionLeaseUntil");
