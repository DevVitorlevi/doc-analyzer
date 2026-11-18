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

export function createDocumentRepository(prisma: PrismaClient) {
  return {
    create(data: NewDocumentData): Promise<DocumentRecord> {
      return prisma.document.create({ data });
    },

    listByUser(userId: string): Promise<DocumentRecord[]> {
      return prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    },

    findByIdForUser(
      id: string,
      userId: string,
    ): Promise<DocumentRecord | null> {
      return prisma.document.findFirst({
        where: { id, userId },
      });
    },

    async deleteByIdForUser(id: string, userId: string): Promise<boolean> {
      const result = await prisma.document.deleteMany({
        where: { id, userId },
      });

      return result.count > 0;
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

    markCompleted(
      id: string,
      userId: string,
      result: DocumentCompletion,
    ): Promise<DocumentRecord> {
      return prisma.document.update({
        where: { id, userId },
        data: {
          status: DocumentStatus.COMPLETED,
          analysis: result.analysis,
          truncated: result.truncated,
          errorCode: null,
          errorMessage: null,
        },
      });
    },

    markFailed(
      id: string,
      userId: string,
      failure: DocumentFailure,
    ): Promise<DocumentRecord> {
      return prisma.document.update({
        where: { id, userId },
        data: {
          status: DocumentStatus.FAILED,
          errorCode: failure.errorCode,
          errorMessage: failure.errorMessage,
          truncated: failure.truncated,
        },
      });
    },
  };
}

export type DocumentRepository = ReturnType<typeof createDocumentRepository>;
