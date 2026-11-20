-- RenameIndex
ALTER INDEX "documents_deletion_queue_idx" RENAME TO "documents_status_deletionNextAttemptAt_deletionLeaseUntil_idx";
