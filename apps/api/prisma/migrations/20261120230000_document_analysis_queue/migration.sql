ALTER TABLE "documents"
ADD COLUMN "analysisNextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "analysisLeaseUntil" TIMESTAMP(3),
ADD COLUMN "analysisAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "analysisError" TEXT;

CREATE INDEX "documents_analysis_queue_idx"
ON "documents" ("status", "analysisNextAttemptAt", "analysisLeaseUntil");
