import {
  DocumentStatus,
  type Document as DocumentRecord,
  type PrismaClient,
} from "@prisma/client";

export interface NewDocumentData {
  id: string;
  userId: string;
  title: string;
  instruction: string;
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentCompletion {
  analysis: string;
  truncated: boolean;
}

export interface DocumentFailure {
  errorCode: string;
  errorMessage: string;
  truncated: boolean;
}

export interface DeletionTask {
  id: string;
  userId: string;
  s3Key: string;
  attempts: number;
  leaseUntil: Date;
}

interface ClaimedDeletionRow {
  id: string;
  userId: string;
  s3Key: string;
  deletionAttempts: number;
  deletionLeaseUntil: Date;
}

export function createDocumentRepository(prisma: PrismaClient) {
  return {
    create(data: NewDocumentData): Promise<DocumentRecord> {
      return prisma.document.create({ data });
    },

    listByUser(userId: string): Promise<DocumentRecord[]> {
      return prisma.document.findMany({
        where: {
          userId,
          status: { not: DocumentStatus.DELETION_PENDING },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    findByIdForUser(
      id: string,
      userId: string,
    ): Promise<DocumentRecord | null> {
      return prisma.document.findFirst({
        where: {
          id,
          userId,
          status: { not: DocumentStatus.DELETION_PENDING },
        },
      });
    },

    async deleteByIdForUser(id: string, userId: string): Promise<boolean> {
      const result = await prisma.document.deleteMany({
        where: { id, userId },
      });

      return result.count > 0;
    },

    async requestDeletion(id: string, userId: string): Promise<boolean> {
      const now = new Date();

      const result = await prisma.document.updateMany({
        where: {
          id,
          userId,
          status: { not: DocumentStatus.DELETION_PENDING },
        },
        data: {
          status: DocumentStatus.DELETION_PENDING,
          deletionRequestedAt: now,
          deletionNextAttemptAt: now,
          deletionLeaseUntil: null,
          deletionAttempts: 0,
          deletionError: null,
        },
      });

      if (result.count === 1) {
        return true;
      }

      const existing = await prisma.document.findFirst({
        where: {
          id,
          userId,
          status: DocumentStatus.DELETION_PENDING,
        },
        select: { id: true },
      });

      return existing !== null;
    },

    async claimNextDeletion(
      now: Date,
      leaseUntil: Date,
    ): Promise<DeletionTask | null> {
      const rows = await prisma.$queryRaw<ClaimedDeletionRow[]>`
        WITH candidate AS (
          SELECT "id"
          FROM "documents"
          WHERE
            "status" = 'DELETION_PENDING'::"DocumentStatus"
            AND (
              "deletionNextAttemptAt" IS NULL
              OR "deletionNextAttemptAt" <= ${now}
            )
            AND (
              "deletionLeaseUntil" IS NULL
              OR "deletionLeaseUntil" <= ${now}
            )
          ORDER BY "deletionRequestedAt" ASC NULLS FIRST
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "documents" AS document
        SET
          "deletionLeaseUntil" = ${leaseUntil},
          "deletionAttempts" = document."deletionAttempts" + 1,
          "updatedAt" = ${now}
        FROM candidate
        WHERE document."id" = candidate."id"
        RETURNING
          document."id" AS "id",
          document."userId" AS "userId",
          document."s3Key" AS "s3Key",
          document."deletionAttempts" AS "deletionAttempts",
          document."deletionLeaseUntil" AS "deletionLeaseUntil"
      `;

      const row = rows[0];

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        userId: row.userId,
        s3Key: row.s3Key,
        attempts: row.deletionAttempts,
        leaseUntil: row.deletionLeaseUntil,
      };
    },

    async completeDeletion(id: string, leaseUntil: Date): Promise<boolean> {
      const result = await prisma.document.deleteMany({
        where: {
          id,
          status: DocumentStatus.DELETION_PENDING,
          deletionLeaseUntil: leaseUntil,
        },
      });

      return result.count === 1;
    },

    async rescheduleDeletion(
      id: string,
      leaseUntil: Date,
      nextAttemptAt: Date,
      errorMessage: string,
    ): Promise<boolean> {
      const result = await prisma.document.updateMany({
        where: {
          id,
          status: DocumentStatus.DELETION_PENDING,
          deletionLeaseUntil: leaseUntil,
        },
        data: {
          deletionLeaseUntil: null,
          deletionNextAttemptAt: nextAttemptAt,
          deletionError: errorMessage,
        },
      });

      return result.count === 1;
    },

    async markProcessing(id: string, userId: string): Promise<boolean> {
      const result = await prisma.document.updateMany({
        where: {
          id,
          userId,
          status: DocumentStatus.FAILED,
        },
        data: {
          status: DocumentStatus.PROCESSING,
          analysis: null,
          errorCode: null,
          errorMessage: null,
          truncated: false,
        },
      });

      return result.count === 1;
    },

    async markCompleted(
      id: string,
      userId: string,
      result: DocumentCompletion,
    ): Promise<DocumentRecord> {
      const updated = await prisma.document.updateManyAndReturn({
        where: {
          id,
          userId,
          status: DocumentStatus.PROCESSING,
        },
        data: {
          status: DocumentStatus.COMPLETED,
          analysis: result.analysis,
          truncated: result.truncated,
          errorCode: null,
          errorMessage: null,
        },
      });

      if (!updated[0])
        throw new Error("Document is no longer eligible for this update.");
      return updated[0];
    },

    async markFailed(
      id: string,
      userId: string,
      failure: DocumentFailure,
    ): Promise<DocumentRecord> {
      const updated = await prisma.document.updateManyAndReturn({
        where: {
          id,
          userId,
          status: { in: [DocumentStatus.PROCESSING, DocumentStatus.FAILED] },
        },
        data: {
          status: DocumentStatus.FAILED,
          errorCode: failure.errorCode,
          errorMessage: failure.errorMessage,
          truncated: failure.truncated,
        },
      });

      if (!updated[0])
        throw new Error("Document is no longer eligible for this update.");
      return updated[0];
    },
  };
}

export type DocumentRepository = ReturnType<typeof createDocumentRepository>;
