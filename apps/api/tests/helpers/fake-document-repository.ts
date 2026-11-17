import type { Document as DocumentRecord } from "@prisma/client";
import type { DocumentRepository } from "@/repositories/document-repository";

export function createFakeDocumentRepository(
  options: { failCreate?: boolean } = {},
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

    async markCompleted(id, userId, result) {
      const updated: DocumentRecord = {
        ...getOwned(id, userId),
        status: "COMPLETED",
        analysis: result.analysis,
        truncated: result.truncated,
        errorCode: null,
        errorMessage: null,
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
      };

      records.set(id, updated);

      return updated;
    },
  };

  return { repository, records };
}
