import type { Document as DocumentRecord } from "@prisma/client";
import type {
  DocumentAnalysisTask,
  DocumentRepository,
} from "@/repositories/document-repository";

export function createFakeDocumentRepository(
  options: {
    failCreate?: boolean;
    failDelete?: boolean;
  } = {},
) {
  const records = new Map<string, DocumentRecord>();

  function getOwned(id: string, userId: string): DocumentRecord {
    const record = records.get(id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }
    return record;
  }

  const repository: DocumentRepository = {
    async create(data) {
      if (options.failCreate) throw new Error("db down");

      const now = new Date();
      const record: DocumentRecord = {
        ...data,
        analysis: null,
        status: "PROCESSING",
        errorCode: null,
        errorMessage: null,
        truncated: false,
        createdAt: now,
        updatedAt: now,
        deletionRequestedAt: null,
        deletionNextAttemptAt: null,
        deletionLeaseUntil: null,
        deletionAttempts: 0,
        deletionError: null,
      analysisNextAttemptAt: new Date(),
      analysisLeaseUntil: null,
      analysisAttempts: 0,
      analysisError: null,
      };

      records.set(record.id, record);
      return record;
    },

    async listByUser(userId) {
      return [...records.values()]
        .filter(
          (record) =>
            record.userId === userId && record.status !== "DELETION_PENDING",
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async findByIdForUser(id, userId) {
      const record = records.get(id);
      if (
        !record ||
        record.userId !== userId ||
        record.status === "DELETION_PENDING"
      ) {
        return null;
      }
      return record;
    },

    async deleteByIdForUser(id, userId) {
      if (options.failDelete) throw new Error("db delete failed");
      const record = records.get(id);
      if (!record || record.userId !== userId) return false;
      return records.delete(id);
    },

    async requestDeletion(id, userId) {
      const record = records.get(id);
      if (!record || record.userId !== userId) return false;

      if (record.status === "DELETION_PENDING") return true;

      const now = new Date();
      records.set(id, {
        ...record,
        status: "DELETION_PENDING",
        deletionRequestedAt: now,
        deletionNextAttemptAt: now,
        deletionLeaseUntil: null,
        deletionAttempts: 0,
        deletionError: null,
        updatedAt: now,
      });
      return true;
    },

    async claimNextDeletion(now, leaseUntil) {
      const candidate = [...records.values()]
        .filter(
          (record) =>
            record.status === "DELETION_PENDING" &&
            (!record.deletionNextAttemptAt ||
              record.deletionNextAttemptAt <= now) &&
            (!record.deletionLeaseUntil || record.deletionLeaseUntil <= now),
        )
        .sort(
          (a, b) =>
            (a.deletionRequestedAt?.getTime() ?? 0) -
            (b.deletionRequestedAt?.getTime() ?? 0),
        )[0];

      if (!candidate) return null;

      const updated: DocumentRecord = {
        ...candidate,
        deletionLeaseUntil: leaseUntil,
        deletionAttempts: candidate.deletionAttempts + 1,
        updatedAt: now,
      };
      records.set(candidate.id, updated);

      return {
        id: updated.id,
        userId: updated.userId,
        s3Key: updated.s3Key,
        attempts: updated.deletionAttempts,
        leaseUntil,
      };
    },

    async completeDeletion(id, leaseUntil) {
      const record = records.get(id);
      if (
        !record ||
        record.status !== "DELETION_PENDING" ||
        record.deletionLeaseUntil?.getTime() !== leaseUntil.getTime()
      ) {
        return false;
      }
      return records.delete(id);
    },

    async rescheduleDeletion(id, leaseUntil, nextAttemptAt, errorMessage) {
      const record = records.get(id);
      if (
        !record ||
        record.status !== "DELETION_PENDING" ||
        record.deletionLeaseUntil?.getTime() !== leaseUntil.getTime()
      ) {
        return false;
      }

      records.set(id, {
        ...record,
        deletionLeaseUntil: null,
        deletionNextAttemptAt: nextAttemptAt,
        deletionError: errorMessage,
        updatedAt: new Date(),
      });
      return true;
    },

    async claimNextAnalysis(now, leaseUntil) {
      const candidate = [...records.values()]
        .filter(
          (record) =>
            record.status === "PROCESSING" &&
            record.analysisNextAttemptAt <= now &&
            (!record.analysisLeaseUntil ||
              record.analysisLeaseUntil <= now),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

      if (!candidate) return null;

      const updated: DocumentRecord = {
        ...candidate,
        analysisLeaseUntil: leaseUntil,
        analysisAttempts: candidate.analysisAttempts + 1,
        analysisError: null,
        updatedAt: now,
      };

      records.set(candidate.id, updated);

      return {
        id: updated.id,
        userId: updated.userId,
        s3Key: updated.s3Key,
        instruction: updated.instruction,
        mimeType: updated.mimeType,
        attempts: updated.analysisAttempts,
        leaseUntil,
      } satisfies DocumentAnalysisTask;
    },

    async completeAnalysis(task, result) {
      const record = records.get(task.id);
      if (
        !record ||
        record.userId !== task.userId ||
        record.status !== "PROCESSING" ||
        record.analysisLeaseUntil?.getTime() !== task.leaseUntil.getTime()
      ) {
        return false;
      }

      records.set(task.id, {
        ...record,
        status: "COMPLETED",
        analysis: result.analysis,
        truncated: result.truncated,
        errorCode: null,
        errorMessage: null,
        analysisLeaseUntil: null,
        analysisError: null,
        updatedAt: new Date(),
      });
      return true;
    },

    async failAnalysis(task, failure) {
      const record = records.get(task.id);
      if (
        !record ||
        record.userId !== task.userId ||
        record.status !== "PROCESSING" ||
        record.analysisLeaseUntil?.getTime() !== task.leaseUntil.getTime()
      ) {
        return false;
      }

      records.set(task.id, {
        ...record,
        status: "FAILED",
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        truncated: failure.truncated,
        analysisLeaseUntil: null,
        analysisError: failure.errorMessage,
        updatedAt: new Date(),
      });
      return true;
    },

    async rescheduleAnalysis(task, nextAttemptAt, errorMessage) {
      const record = records.get(task.id);
      if (
        !record ||
        record.userId !== task.userId ||
        record.status !== "PROCESSING" ||
        record.analysisLeaseUntil?.getTime() !== task.leaseUntil.getTime()
      ) {
        return false;
      }

      records.set(task.id, {
        ...record,
        analysisLeaseUntil: null,
        analysisNextAttemptAt: nextAttemptAt,
        analysisError: errorMessage,
        updatedAt: new Date(),
      });
      return true;
    },

    async markProcessing(id, userId) {
      const record = records.get(id);
      if (!record || record.userId !== userId || record.status !== "FAILED") {
        return false;
      }

      records.set(id, {
        ...record,
        status: "PROCESSING",
        analysis: null,
        errorCode: null,
        errorMessage: null,
        truncated: false,
        analysisNextAttemptAt: new Date(),
        analysisLeaseUntil: null,
        analysisAttempts: 0,
        analysisError: null,
        updatedAt: new Date(),
      });
      return true;
    },

    async markCompleted(id, userId, result) {
      const record = getOwned(id, userId);
      if (record.status !== "PROCESSING") {
        throw new Error("Document is no longer processing.");
      }

      const updated: DocumentRecord = {
        ...record,
        status: "COMPLETED",
        analysis: result.analysis,
        truncated: result.truncated,
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      };
      records.set(id, updated);
      return updated;
    },

    async markFailed(id, userId, failure) {
      const record = getOwned(id, userId);
      if (record.status !== "PROCESSING" && record.status !== "FAILED") {
        throw new Error("Document is no longer eligible for failure update.");
      }

      const updated: DocumentRecord = {
        ...record,
        status: "FAILED",
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        truncated: failure.truncated,
        updatedAt: new Date(),
      };
      records.set(id, updated);
      return updated;
    },
  };

  return { repository, records };
}
