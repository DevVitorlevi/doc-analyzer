import type { Document as DocumentRecord } from "@prisma/client";

import type { DocumentRepository } from "@/repositories/document-repository";

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
      if (options.failCreate) {
        throw new Error("db down");
      }

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
      };

      records.set(record.id, record);

      return record;
    },

    async listByUser(userId) {
      return [...records.values()]
        .filter((record) => record.userId === userId)
        .sort(
          (first, second) =>
            second.createdAt.getTime() - first.createdAt.getTime(),
        );
    },

    async findByIdForUser(id, userId) {
      const record = records.get(id);

      if (!record || record.userId !== userId) {
        return null;
      }

      return record;
    },

    async deleteByIdForUser(id, userId) {
      if (options.failDelete) {
        throw new Error("db delete failed");
      }

      const record = records.get(id);

      if (!record || record.userId !== userId) {
        return false;
      }

      return records.delete(id);
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
        updatedAt: new Date(),
      });

      return true;
    },

    async markCompleted(id, userId, result) {
      const updated: DocumentRecord = {
        ...getOwned(id, userId),
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
      const updated: DocumentRecord = {
        ...getOwned(id, userId),
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
